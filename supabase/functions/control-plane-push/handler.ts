import { CP_INBOUND_SCOPES } from "../_shared/control-plane/config.ts";
import { enqueueMetricsSnapshot, flushOutbox } from "../_shared/control-plane/exporter.ts";
import { authorizeControlPlane } from "../_shared/control-plane/guard.ts";
import { json } from "../_shared/http.ts";
import { settleDueInvestments } from "../_shared/settlement.ts";

// GET|POST /functions/v1/control-plane-push
// Prend un instantané des métriques puis vide la file d'envoi vers les
// endpoints d'agrégation du Kernel.
//
// Appelée toutes les 15 minutes par pg_cron (migration 0026, fonction SQL
// cp_trigger_push, Authorization: Bearer <CRON_SECRET>), ou par le Kernel
// lui-même avec un JWT inter-services portant le scope control-plane:push.
// Le même passage dénoue les séquestres d'investissement échus (idempotent).
export async function handle(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Méthode non autorisée" }, 405);
  }
  const ctx = await authorizeControlPlane(
    request,
    [CP_INBOUND_SCOPES.PUSH_TRIGGER],
    { allowCronSecret: true },
  );
  if (!ctx.ok) return ctx.response;

  // Avant l'instantané, pour que les métriques reflètent le dénouement. Un
  // échec est rapporté sans bloquer l'envoi au Control Plane.
  const investments = await settleDueInvestments(ctx.supabase);

  try {
    const withSnapshot = new URL(request.url).searchParams.get("metrics") !== "0";
    if (withSnapshot) await enqueueMetricsSnapshot(ctx.supabase, ctx.config);
    const report = await flushOutbox(ctx.supabase, ctx.config);
    return json({ ...report, investments });
  } catch (err) {
    console.error(`[control-plane] envoi impossible : ${err instanceof Error ? err.message : err}`);
    return json({ error: "Erreur interne" }, 500);
  }
}
