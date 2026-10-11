import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { isOrgAdmin } from "@/lib/api/org-admin";
import {
  AuditEventRow,
  paginateAuditEvents,
  parseAuditQuery,
  serializeAuditEvent,
} from "@/lib/audit";
import { AUDIT_LABELS } from "@/utils/constants";

// GET /api/organizations/:orgId/audit-events?event_type=…&since=ISO&before=ISO&limit=N
// Journal d'audit de l'organisation, du plus récent au plus ancien.
// Réservé aux admins de l'organisation. Pagination : repasser `next_before`
// dans `before`.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;
  const { orgId } = await params;

  if (!(await isOrgAdmin(supabase, orgId, user.id))) {
    return NextResponse.json({ error: AUDIT_LABELS.FORBIDDEN }, { status: 403 });
  }

  const parsed = parseAuditQuery(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        error:
          parsed.error === "event_type"
            ? AUDIT_LABELS.INVALID_EVENT_TYPE
            : AUDIT_LABELS.INVALID_DATE,
      },
      { status: 400 },
    );
  }
  const { eventType, since, before, limit } = parsed.query;

  try {
    let query = supabase
      .from("audit_events")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      // Une ligne de plus que la page pour savoir s'il en reste.
      .limit(limit + 1);
    if (eventType) query = query.eq("event_type", eventType);
    if (since) query = query.gte("created_at", since);
    if (before) query = query.lt("created_at", before);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const events = ((data ?? []) as AuditEventRow[]).map(serializeAuditEvent);
    return NextResponse.json(paginateAuditEvents(events, limit), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return apiError(err);
  }
}
