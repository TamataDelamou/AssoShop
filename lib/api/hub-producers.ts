import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_REFERRAL_REWARD = 2000;

// Producteur parrainage : enregistre un filleul (en attente de conversion).
export async function recordReferral(
  supabase: SupabaseClient,
  userId: string,
  referredName: string,
) {
  const { data, error } = await supabase
    .from("hub_referrals")
    .insert({
      user_id: userId,
      referred_name: referredName,
      status: "pending",
      reward: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Convertit un filleul : passage à "active" + récompense forfaitaire.
export async function convertReferral(
  supabase: SupabaseClient,
  userId: string,
  referralId: string,
) {
  const { data, error } = await supabase
    .from("hub_referrals")
    .update({ status: "active", reward: DEFAULT_REFERRAL_REWARD })
    .eq("id", referralId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Producteur synchro : place une action hors-ligne dans la file d'attente.
export async function enqueueSync(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  module: string,
) {
  const { data, error } = await supabase
    .from("hub_sync_queue")
    .insert({
      user_id: userId,
      action,
      module,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
