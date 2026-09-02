import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";

interface OrganizationRow {
  id: string;
  name: string;
  type: string;
  city: string | null;
  object: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  members: { count: number }[] | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { orgId } = await params;

  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, type, city, object, status, created_at, updated_at, members(count)",
    )
    .eq("id", orgId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Organisation introuvable" },
      { status: 404 },
    );
  }

  const org = data as OrganizationRow;
  return NextResponse.json({
    id: org.id,
    name: org.name,
    type: org.type,
    city: org.city,
    object: org.object,
    status: org.status,
    memberCount: org.members?.[0]?.count ?? 0,
    created_at: org.created_at,
    updated_at: org.updated_at,
  });
}
