import { NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AdminContext =
  | { supabase: SupabaseClient; user: User }
  | { response: NextResponse };

// Authentifie l'utilisateur puis vérifie son appartenance à la table
// platform_admins (via le client service_role qui contourne RLS).
export async function getAdminContext(): Promise<AdminContext> {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx;

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!data) {
    return {
      response: NextResponse.json(
        { error: "Accès réservé aux administrateurs" },
        { status: 403 },
      ),
    };
  }

  return { supabase, user: ctx.user };
}
