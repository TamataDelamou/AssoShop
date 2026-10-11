import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CP_DEFAULTS,
  CP_OUTBOUND_SCOPES,
  type ControlPlaneConfig,
} from "@/lib/control-plane/config";
import { signServiceToken } from "@/lib/control-plane/jwt";
import { buildMetricsSnapshot } from "@/lib/control-plane/metrics";

// ---------------------------------------------------------------------------
// Export vers les endpoints d'agrégation du Kernel (pattern outbox).
// Les journaux d'audit sont mis en file par trigger SQL ; les métriques par
// enqueueMetricsSnapshot(). flushOutbox() envoie par lots, avec rejeu
// exponentiel et clé d'idempotence (le Kernel peut dédoublonner).
// ---------------------------------------------------------------------------

export type OutboxKind = "audit_log" | "metrics_snapshot";

export interface OutboxRow {
  id: string;
  kind: OutboxKind;
  payload: Record<string, unknown>;
  attempts: number;
}

export interface FlushReport {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  skipped: string[];
}

type FetchLike = typeof fetch;

const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 6 * 60 * 60 * 1000;

/** Délai avant la prochaine tentative : 30 s, 1 min, 2 min… plafonné à 6 h. */
export function computeBackoffMs(attempts: number): number {
  const exp = Math.max(0, attempts - 1);
  return Math.min(BASE_BACKOFF_MS * 2 ** exp, MAX_BACKOFF_MS);
}

/** Clé d'idempotence stable pour un lot donné. */
export function idempotencyKey(ids: string[]): string {
  return createHash("sha256").update([...ids].sort().join(",")).digest("hex");
}

/** Corps envoyé au Kernel pour un lot d'un même type. */
export function buildBatchBody(
  kind: OutboxKind,
  rows: OutboxRow[],
  config: ControlPlaneConfig,
  now: Date = new Date(),
): Record<string, unknown> {
  const envelope = {
    service: config.serviceId,
    instance: config.instanceId,
    sent_at: now.toISOString(),
  };
  if (kind === "audit_log") {
    return {
      ...envelope,
      schema: "gsg.audit.v1",
      events: rows.map((r) => ({ outbox_id: r.id, ...r.payload })),
    };
  }
  return {
    ...envelope,
    schema: "gsg.metrics.batch.v1",
    snapshots: rows.map((r) => ({ outbox_id: r.id, ...r.payload })),
  };
}

export async function postToKernel(
  url: string,
  body: Record<string, unknown>,
  ids: string[],
  scope: string,
  config: ControlPlaneConfig,
  fetchImpl: FetchLike = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!config.outboundKey) return { ok: false, error: "cle_sortante_absente" };

  const token = signServiceToken(
    {
      issuer: config.serviceId,
      subject: config.instanceId,
      audience: config.kernelIssuer,
      scopes: [scope],
      ttlSeconds: CP_DEFAULTS.OUTBOUND_TTL_SECONDS,
    },
    config.outboundKey,
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CP_DEFAULTS.HTTP_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": idempotencyKey(ids),
        "X-GSG-Service": config.serviceId,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `http_${res.status}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "erreur_reseau",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Calcule un instantané de métriques et le place dans la file d'envoi. */
export async function enqueueMetricsSnapshot(
  supabase: SupabaseClient,
  config: ControlPlaneConfig,
): Promise<void> {
  const snapshot = await buildMetricsSnapshot(supabase, config);
  const { error } = await supabase
    .from("control_plane_outbox")
    .insert({ kind: "metrics_snapshot", payload: snapshot });
  if (error) throw new Error(`Mise en file impossible : ${error.message}`);
}

async function markSent(supabase: SupabaseClient, ids: string[]) {
  await supabase
    .from("control_plane_outbox")
    .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
    .in("id", ids);
}

async function markFailure(
  supabase: SupabaseClient,
  rows: OutboxRow[],
  error: string,
): Promise<{ retried: number; failed: number }> {
  let retried = 0;
  let failed = 0;
  for (const row of rows) {
    const attempts = row.attempts + 1;
    const exhausted = attempts >= CP_DEFAULTS.MAX_ATTEMPTS;
    await supabase
      .from("control_plane_outbox")
      .update({
        attempts,
        status: exhausted ? "failed" : "pending",
        last_error: error.slice(0, 500),
        next_attempt_at: new Date(Date.now() + computeBackoffMs(attempts)).toISOString(),
      })
      .eq("id", row.id);
    if (exhausted) failed += 1;
    else retried += 1;
  }
  return { retried, failed };
}

/** Envoie un lot de la file vers le Kernel. Sûr en exécution concurrente. */
export async function flushOutbox(
  supabase: SupabaseClient,
  config: ControlPlaneConfig,
  fetchImpl: FetchLike = fetch,
): Promise<FlushReport> {
  const report: FlushReport = { claimed: 0, sent: 0, retried: 0, failed: 0, skipped: [] };

  const { data, error } = await supabase.rpc("cp_claim_outbox", {
    batch_size: CP_DEFAULTS.BATCH_SIZE,
  });
  if (error) throw new Error(`Lecture de la file impossible : ${error.message}`);
  const rows = (data ?? []) as OutboxRow[];
  report.claimed = rows.length;

  const targets: Record<OutboxKind, { url: string | null; scope: string }> = {
    audit_log: { url: config.auditIngestUrl, scope: CP_OUTBOUND_SCOPES.AUDIT_WRITE },
    metrics_snapshot: {
      url: config.metricsIngestUrl,
      scope: CP_OUTBOUND_SCOPES.METRICS_WRITE,
    },
  };

  for (const kind of Object.keys(targets) as OutboxKind[]) {
    const batch = rows.filter((r) => r.kind === kind);
    if (batch.length === 0) continue;
    const { url, scope } = targets[kind];
    if (!url) {
      // Endpoint non configuré : on laisse en file (bail de 2 min), sans
      // consommer de tentative.
      report.skipped.push(kind);
      continue;
    }
    const ids = batch.map((r) => r.id);
    const result = await postToKernel(
      url,
      buildBatchBody(kind, batch, config),
      ids,
      scope,
      config,
      fetchImpl,
    );
    if (result.ok) {
      await markSent(supabase, ids);
      report.sent += batch.length;
    } else {
      const { retried, failed } = await markFailure(supabase, batch, result.error);
      report.retried += retried;
      report.failed += failed;
    }
  }

  return report;
}
