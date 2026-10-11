import { CP_DEFAULTS, CP_INBOUND_SCOPES } from "../_shared/control-plane/config.ts";
import { authorizeControlPlane, type ControlPlaneContext } from "../_shared/control-plane/guard.ts";
import { buildMetricsSnapshot } from "../_shared/control-plane/metrics.ts";
import { json } from "../_shared/http.ts";

// Points d'accès interrogés par le Control Plane GSG (Kernel), protégés par un
// JWT inter-services (signature, iss/aud/exp, scope, jti à usage unique) :
//
//   GET /functions/v1/control-plane/health       scope health:read
//   GET /functions/v1/control-plane/metrics      scope metrics:read
//   GET /functions/v1/control-plane/audit-logs   scope audit:read
//       ?source=admin|security|activity&since=ISO&limit=≤500
//
// Tant que CONTROL_PLANE_ENABLED ne vaut pas 1, tout répond 404.

type Authorized = Extract<ControlPlaneContext, { ok: true }>;

const SOURCES = {
  admin: "admin_audit_logs",
  security: "admin_security_audit",
  // Journal des actions métier (migration 0018, cahier v6 §14).
  activity: "audit_events",
} as const;
type Source = keyof typeof SOURCES;

// Dernier segment du chemin : « health », « metrics » ou « audit-logs ».
export function endpointOf(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? "";
}

async function health({ supabase, config }: Authorized): Promise<Response> {
  const [pending, failed, database] = await Promise.all([
    supabase.from("control_plane_outbox").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("control_plane_outbox").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("organizations").select("id", { head: true }).limit(1),
  ]);
  const databaseOk = !database.error;
  return json(
    {
      status: databaseOk ? "ok" : "degraded",
      service: config.serviceId,
      instance: config.instanceId,
      time: new Date().toISOString(),
      checks: {
        database: databaseOk ? "ok" : "error",
        outbox_pending: pending.count ?? null,
        outbox_failed: failed.count ?? null,
        reporting_configured: Boolean(
          config.metricsIngestUrl && config.auditIngestUrl && config.outboundKey,
        ),
      },
    },
    databaseOk ? 200 : 503,
  );
}

async function auditLogs(request: Request, ctx: Authorized): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const source = (params.get("source") ?? "admin") as Source;
  if (!Object.hasOwn(SOURCES, source)) return json({ error: "source_invalide" }, 400);

  const sinceRaw = params.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : new Date(0);
  if (Number.isNaN(since.getTime())) return json({ error: "since_invalide" }, 400);

  const requested = Number(params.get("limit") ?? CP_DEFAULTS.AUDIT_PAGE_MAX);
  const limit = Math.min(
    Math.max(Number.isFinite(requested) ? Math.floor(requested) : 1, 1),
    CP_DEFAULTS.AUDIT_PAGE_MAX,
  );

  const { data, error } = await ctx.supabase
    .from(SOURCES[source])
    .select("*")
    .gt("created_at", since.toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error(`[control-plane] journaux indisponibles : ${error.message}`);
    return json({ error: "Erreur interne" }, 500);
  }

  const events = data ?? [];
  const last = events.at(-1) as { created_at?: string } | undefined;
  return json({
    schema: "gsg.audit.v1",
    service: ctx.config.serviceId,
    instance: ctx.config.instanceId,
    source,
    events,
    next_since: last?.created_at ?? null,
    has_more: events.length === limit,
  });
}

const SCOPES: Record<string, string> = {
  health: CP_INBOUND_SCOPES.HEALTH_READ,
  metrics: CP_INBOUND_SCOPES.METRICS_READ,
  "audit-logs": CP_INBOUND_SCOPES.AUDIT_READ,
};

export async function handle(request: Request): Promise<Response> {
  const endpoint = endpointOf(request);
  const scope = SCOPES[endpoint];
  if (!scope) return json({ error: "introuvable" }, 404);
  if (request.method !== "GET") return json({ error: "Méthode non autorisée" }, 405);

  const ctx = await authorizeControlPlane(request, [scope]);
  if (!ctx.ok) return ctx.response;

  if (endpoint === "health") return health(ctx);
  if (endpoint === "audit-logs") return auditLogs(request, ctx);
  try {
    return json(await buildMetricsSnapshot(ctx.supabase, ctx.config));
  } catch (err) {
    console.error(`[control-plane] métriques indisponibles : ${err instanceof Error ? err.message : err}`);
    return json({ error: "Erreur interne" }, 500);
  }
}
