import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AuthedContext =
  | { supabase: SupabaseClient; user: User }
  | { response: NextResponse };

// Récupère le client Supabase et l'utilisateur courant, ou une réponse 401.
export async function getAuthedContext(): Promise<AuthedContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }

  return { supabase, user };
}

// Convertit une erreur interne en réponse JSON cohérente (404 si introuvable).
export function apiError(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : "Erreur interne";
  const status = message.includes("introuvable") ? 404 : 500;
  return NextResponse.json({ error: message }, { status });
}
