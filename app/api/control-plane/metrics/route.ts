import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { CP_INBOUND_SCOPES } from "@/lib/control-plane/config";
import { authorizeControlPlane } from "@/lib/control-plane/guard";
import { buildMetricsSnapshot } from "@/lib/control-plane/metrics";

// GET /api/control-plane/metrics — instantané des métriques clés, calculé à la
// demande (agrégats uniquement). Scope requis : metrics:read.
export async function GET(request: Request) {
  const ctx = await authorizeControlPlane(request, [CP_INBOUND_SCOPES.METRICS_READ]);
  if (!ctx.ok) return ctx.response;

  try {
    const snapshot = await buildMetricsSnapshot(ctx.supabase, ctx.config);
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return apiError(err);
  }
}
