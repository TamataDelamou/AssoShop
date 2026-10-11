import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

interface RecipientRow {
  id: string;
  user_id: string;
  name: string;
  organization_id: string;
  organizations: { name: string } | { name: string }[] | null;
}

// GET /api/pay/recipients
// Destinataires possibles d'un transfert : membres actifs, dotés d'un compte,
// des organisations de l'utilisateur (la lecture de members est déjà limitée
// à ses organisations par RLS). Ni téléphone ni e-mail ne sont renvoyés.
export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    const { data, error } = await supabase
      .from("members")
      .select("id, user_id, name, organization_id, organizations(name)")
      .not("user_id", "is", null)
      .neq("user_id", user.id)
      .eq("status", "active")
      .order("name");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as RecipientRow[];
    return NextResponse.json(
      rows.map((row) => {
        const organization = Array.isArray(row.organizations)
          ? row.organizations[0]
          : row.organizations;
        return {
          member_id: row.id,
          user_id: row.user_id,
          name: row.name,
          organization_id: row.organization_id,
          organization_name: organization?.name ?? "",
        };
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return apiError(err);
  }
}
