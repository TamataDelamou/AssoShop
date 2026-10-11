import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { env } from "./env.ts";
import { bearer } from "./http.ts";

// SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis
// automatiquement aux Edge Functions par la plateforme.

const OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

// Client service_role : réservé aux fonctions serveur (webhook, tâches
// planifiées, Control Plane). Ne jamais renvoyer ses résultats bruts à un
// client sans contrôle d'accès préalable.
export function createSupabaseAdminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL")!, env("SUPABASE_SERVICE_ROLE_KEY")!, OPTIONS);
}

// Utilisateur désigné par le jeton Supabase de la requête, vérifié auprès du
// service d'authentification (signature, expiration, session non révoquée).
export async function userFromRequest(request: Request): Promise<User | null> {
  const token = bearer(request);
  if (!token) return null;
  const client = createClient(env("SUPABASE_URL")!, env("SUPABASE_ANON_KEY")!, OPTIONS);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
