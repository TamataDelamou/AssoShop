import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { CP_INBOUND_SCOPES } from "@/lib/control-plane/config";
import { enqueueMetricsSnapshot, flushOutbox } from "@/lib/control-plane/exporter";
import { authorizeControlPlane } from "@/lib/control-plane/guard";

// /api/control-plane/push — prend un instantané des métriques puis vide la file
// d'envoi vers les endpoints d'agrégation du Kernel.
// Appelé par le planificateur (Authorization: Bearer CRON_SECRET), ou par le
// Kernel lui-même avec un JWT portant le scope control-plane:push.
async function handle(request: Request) {
  const ctx = await authorizeControlPlane(
    request,
    [CP_INBOUND_SCOPES.PUSH_TRIGGER],
    { allowCronSecret: true },
  );
  if (!ctx.ok) return ctx.response;

  try {
    const withSnapshot = new URL(request.url).searchParams.get("metrics") !== "0";
    if (withSnapshot) await enqueueMetricsSnapshot(ctx.supabase, ctx.config);
    const report = await flushOutbox(ctx.supabase, ctx.config);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return apiError(err);
  }
}

// GET : compatibilité avec les planificateurs qui n'émettent que des GET.
export const GET = handle;
export const POST = handle;
