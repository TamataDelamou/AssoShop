import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { CP_DEFAULTS, CP_INBOUND_SCOPES } from "@/lib/control-plane/config";
import { authorizeControlPlane } from "@/lib/control-plane/guard";

const SOURCES = {
  admin: "admin_audit_logs",
  security: "admin_security_audit",
} as const;
type Source = keyof typeof SOURCES;

// GET /api/control-plane/audit-logs?source=admin|security&since=ISO&limit=N
// Lecture paginée (ordre chronologique croissant) des journaux d'audit.
// Pagination : repasser `next_since` dans `since`. Scope requis : audit:read.
export async function GET(request: Request) {
  const ctx = await authorizeControlPlane(request, [CP_INBOUND_SCOPES.AUDIT_READ]);
  if (!ctx.ok) return ctx.response;

  const params = new URL(request.url).searchParams;
  const source = (params.get("source") ?? "admin") as Source;
  if (!(source in SOURCES)) {
    return NextResponse.json({ error: "source_invalide" }, { status: 400 });
  }

  const sinceRaw = params.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : new Date(0);
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "since_invalide" }, { status: 400 });
  }

  const requested = Number(params.get("limit") ?? CP_DEFAULTS.AUDIT_PAGE_MAX);
  const limit = Math.min(
    Math.max(Number.isFinite(requested) ? Math.floor(requested) : 1, 1),
    CP_DEFAULTS.AUDIT_PAGE_MAX,
  );

  try {
    const { data, error } = await ctx.supabase
      .from(SOURCES[source])
      .select("*")
      .gt("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);

    const events = data ?? [];
    const last = events.at(-1) as { created_at?: string } | undefined;
    return NextResponse.json(
      {
        schema: "gsg.audit.v1",
        service: ctx.config.serviceId,
        instance: ctx.config.instanceId,
        source,
        events,
        next_since: last?.created_at ?? null,
        has_more: events.length === limit,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return apiError(err);
  }
}
