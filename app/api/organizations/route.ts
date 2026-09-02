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

function serializeOrganization(org: OrganizationRow) {
  return {
    id: org.id,
    name: org.name,
    type: org.type,
    city: org.city,
    object: org.object,
    status: org.status,
    memberCount: org.members?.[0]?.count ?? 0,
    created_at: org.created_at,
    updated_at: org.updated_at,
  };
}

export async function GET(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const rawSearch = request.nextUrl.searchParams.get("search") ?? "";
  const search = rawSearch.replace(/[%,]/g, "");

  let query = supabase
    .from("organizations")
    .select(
      "id, name, type, city, object, status, created_at, updated_at, members(count)",
    )
    .order("created_at", { ascending: false });

  if (search) {
    const pattern = `%${search}%`;
    query = query.or(
      `name.ilike.${pattern},city.ilike.${pattern},object.ilike.${pattern}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data as OrganizationRow[]).map(serializeOrganization));
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = await request.json().catch(() => null);
  if (!payload?.name || !payload?.type) {
    return NextResponse.json({ error: "Nom et type requis" }, { status: 400 });
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: payload.name,
      type: payload.type,
      city: payload.city ?? null,
      object: payload.object ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error || !org) {
    return NextResponse.json(
      { error: error?.message ?? "Erreur de création" },
      { status: 500 },
    );
  }

  // Le créateur devient admin de l'organisation.
  const { error: membershipError } = await supabase.from("memberships").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "admin",
  });

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 },
    );
  }

  return NextResponse.json(serializeOrganization(org as OrganizationRow), {
    status: 201,
  });
}
