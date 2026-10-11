import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { MemberRow, serializeMember } from "@/lib/api/members";
import { isOrgAdmin } from "@/lib/api/org-admin";

const FORBIDDEN = { error: "Action réservée aux administrateurs" };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const { orgId, memberId } = await params;
  if (!(await isOrgAdmin(supabase, orgId, user.id))) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }

  const payload = await request.json().catch(() => null);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload?.status) patch.status = payload.status;
  if (payload?.role) patch.role = payload.role;

  const { data, error } = await supabase
    .from("members")
    .update(patch)
    .eq("id", memberId)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Membre introuvable" },
      { status: 404 },
    );
  }

  return NextResponse.json(serializeMember(data as MemberRow));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const { orgId, memberId } = await params;
  if (!(await isOrgAdmin(supabase, orgId, user.id))) {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }

  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
