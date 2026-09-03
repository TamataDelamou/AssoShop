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

  const { data: created, error } = await supabase
    .from("pay_wallets")
    .insert({
      user_id: userId,
      type: "personal",
      label: "",
      currency: "GNF",
      balance: 0,
      last_known_balance: 0,
    })
    .select()
    .single();

  if (error) {
    // Course possible : un autre appel a déjà créé le portefeuille.
    const { data: retry } = await supabase
      .from("pay_wallets")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "personal")
      .maybeSingle();
    if (retry) return retry as PersonalWallet;
    throw error;
  }

  return created as PersonalWallet;
}

// Résout le portefeuille visé par un wallet_id, ou le portefeuille personnel
// par défaut lorsque aucun identifiant n'est fourni.
export async function getWallet(
  supabase: SupabaseClient,
  userId: string,
  walletId?: string | null,
): Promise<PersonalWallet | null> {
  if (walletId) {
    const { data } = await supabase
      .from("pay_wallets")
      .select("*")
      .eq("id", walletId)
      .eq("user_id", userId)
      .maybeSingle();
    return (data as PersonalWallet) ?? null;
  }
  return ensurePersonalWallet(supabase, userId);
}
