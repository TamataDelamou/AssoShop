import type { SupabaseClient } from "@supabase/supabase-js";
import type { ControlPlaneConfig } from "@/lib/control-plane/config";

// Enveloppe standard d'un instantané de métriques envoyé au Control Plane.
// Uniquement des agrégats : aucune donnée personnelle ne quitte AssoShop.
export interface MetricsSnapshot {
  schema: "gsg.metrics.v1";
  service: string;
  instance: string;
  generated_at: string;
  currency: string;
  metrics: Record<string, number>;
}

export const METRICS_CURRENCY = "GNF";

function toNumbers(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(n)) out[key] = n;
    }
  }
  return out;
}

/** Calcule l'instantané via la fonction SQL cp_metrics_snapshot (service_role). */
export async function buildMetricsSnapshot(
  supabase: SupabaseClient,
  config: ControlPlaneConfig,
  now: Date = new Date(),
): Promise<MetricsSnapshot> {
  const { data, error } = await supabase.rpc("cp_metrics_snapshot");
  if (error) throw new Error(`Métriques indisponibles : ${error.message}`);
  return {
    schema: "gsg.metrics.v1",
    service: config.serviceId,
    instance: config.instanceId,
    generated_at: now.toISOString(),
    currency: METRICS_CURRENCY,
    metrics: toNumbers(data),
  };
}
