import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ENV_CONFIG } from "@/lib/env.config";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    ENV_CONFIG.SUPABASE_URL,
    ENV_CONFIG.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Lecture seule (Server Component) : le rafraîchissement des tokens
            // est assuré par proxy.ts.
          }
        },
      },
    },
  );
}

// Client serveur avec la clé service_role : contourne RLS, réservé aux
// routes d'administration (jamais exposé côté client).
export function createSupabaseAdminClient() {
  return createClient(
    ENV_CONFIG.SUPABASE_URL,
    ENV_CONFIG.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
