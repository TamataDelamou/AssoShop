// Désignation du destinataire d'un transfert (migrations 0021 et 0022) : un
// membre d'une organisation commune, désigné par sa fiche membre ou par son
// identifiant utilisateur, jamais un libellé.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export interface TransferTarget {
  to_member_id: string | null;
  to_user_id: string | null;
}

function isProvided(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

// Renvoie la cible du transfert, ou null si aucun identifiant valide n'est
// fourni. Un champ présent mais mal formé invalide toute la demande.
export function parseTransferTarget(payload: unknown): TransferTarget | null {
  if (!payload || typeof payload !== "object") return null;
  const { to_member_id, to_user_id } = payload as Record<string, unknown>;

  const hasMember = isProvided(to_member_id);
  const hasUser = isProvided(to_user_id);
  if (!hasMember && !hasUser) return null;
  if (hasMember && !isUuid(to_member_id)) return null;
  if (hasUser && !isUuid(to_user_id)) return null;

  return {
    to_member_id: hasMember ? (to_member_id as string) : null,
    to_user_id: hasUser ? (to_user_id as string) : null,
  };
}
