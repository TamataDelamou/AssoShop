import type { SupabaseClient } from "@supabase/supabase-js";

export const ORG_ADMIN_ROLE = "admin";

// Seul un admin de l'organisation peut changer le rôle ou le statut d'un
// membre, ou le supprimer.
export function canManageMembers(
  membership: { role?: string | null } | null | undefined,
): boolean {
  return membership?.role === ORG_ADMIN_ROLE;
}

// L'utilisateur est-il admin de l'organisation (memberships.role = 'admin') ?
// Toute erreur de lecture vaut refus.
export async function isOrgAdmin(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return canManageMembers(data as { role?: string | null } | null);
}
