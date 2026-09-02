import { createServerClient } from "@supabase/ssr";
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
