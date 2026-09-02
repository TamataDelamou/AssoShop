import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { MemberRow, serializeMember } from "@/lib/api/members";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;

  const { data, error } = await supabase
    .from("members")
    .select("id, organization_id, user_id, name, email, phone, status, role, joined_at")
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data as MemberRow[]).map(serializeMember));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const { orgId } = await params;
  const payload = await request.json().catch(() => null);
  if (!payload?.name) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("members")
    .insert({
      organization_id: orgId,
      user_id: user.id,
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      status: "pending",
      role: "member",
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Erreur lors de la demande d'adhésion" },
      { status: 500 },
    );
  }

  return NextResponse.json(serializeMember(data as MemberRow), { status: 201 });
}
