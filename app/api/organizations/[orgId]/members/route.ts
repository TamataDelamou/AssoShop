import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import {
  deriveMemberName,
  MemberRow,
  serializeMember,
} from "@/lib/api/members";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;
  const search = request.nextUrl.searchParams.get("search") ?? "";

  let query = supabase
    .from("members")
    .select("id, organization_id, user_id, name, email, phone, status, role, joined_at")
    .eq("organization_id", orgId)
    .order("joined_at", { ascending: true, nullsFirst: false });

  if (search) {
    const pattern = `%${search}%`;
    query = query.or(
      `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
    );
  }

  const { data, error } = await query;
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
  const { supabase } = ctx;

  const { orgId } = await params;
  const payload = await request.json().catch(() => null);
  if (!payload?.role) {
    return NextResponse.json({ error: "Rôle requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("members")
    .insert({
      organization_id: orgId,
      user_id: payload.user_id ?? null,
      name: deriveMemberName(payload.email),
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      status: "pending",
      role: payload.role,
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Erreur d'ajout du membre" },
      { status: 500 },
    );
  }

  return NextResponse.json(serializeMember(data as MemberRow), { status: 201 });
}
