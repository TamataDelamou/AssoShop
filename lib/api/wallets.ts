import type { SupabaseClient } from "@supabase/supabase-js";

export interface PersonalWallet {
  id: string;
  user_id: string;
  type: string;
  label: string;
  currency: string;
  balance: number;
  last_known_balance: number;
  created_at: string;
  updated_at: string;
}

// Portefeuille personnel unique (type = 'personal'), créé à la demande.
export async function ensurePersonalWallet(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersonalWallet> {
  const { data: existing } = await supabase
    .from("pay_wallets")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "personal")
    .maybeSingle();
  if (existing) return existing as PersonalWallet;

  // Création via la fonction SQL pay_ensure_wallet : le client n'a plus le
  // droit d'écrire dans pay_wallets (migration 0017).
  const { data: created, error } = await supabase.rpc("pay_ensure_wallet");
  if (error) throw error;

  const wallet = Array.isArray(created) ? created[0] : created;
  if (!wallet) throw new Error("Portefeuille introuvable");
  return wallet as PersonalWallet;
}
