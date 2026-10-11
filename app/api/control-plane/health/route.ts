import { NextResponse } from "next/server";
import { CP_INBOUND_SCOPES } from "@/lib/control-plane/config";
import { authorizeControlPlane } from "@/lib/control-plane/guard";

// GET /api/control-plane/health — état de l'instance pour le tableau de bord
// central du Kernel. Scope requis : health:read.
export async function GET(request: Request) {
  const ctx = await authorizeControlPlane(request, [CP_INBOUND_SCOPES.HEALTH_READ]);
  if (!ctx.ok) return ctx.response;
  const { supabase, config } = ctx;

  const [pending, failed, database] = await Promise.all([
    supabase
      .from("control_plane_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("control_plane_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase.from("organizations").select("id", { head: true }).limit(1),
  ]);

  const databaseOk = !database.error;
  return NextResponse.json(
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
    { status: databaseOk ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
