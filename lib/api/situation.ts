import type { SupabaseClient } from "@supabase/supabase-js";

export interface FinancialSituation {
  contributions: number;
  savings: number;
  tontine: number;
  aids_received: number;
  loans_outstanding: number;
  currency: string;
}

// Agrège la situation financière personnelle de l'utilisateur à partir des
// modules community/finance, en passant par les ponts vers auth.users :
//   - contributions -> members.user_id
//   - group_payments / loans -> group_members.user_id
export async function getFinancialSituation(
  supabase: SupabaseClient,
  userId: string,
): Promise<FinancialSituation> {
  const situation: FinancialSituation = {
    contributions: 0,
    savings: 0,
    tontine: 0,
    aids_received: 0,
    loans_outstanding: 0,
    currency: "GNF",
  };

  // Cotisations payées via les lignes "members" liées au compte.
  const { data: members } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", userId);
  const memberIds = (members ?? []).map((m) => m.id);
  if (memberIds.length > 0) {
    const { data: contributions } = await supabase
      .from("contributions")
      .select("amount")
      .in("member_id", memberIds)
      .eq("status", "paid");
    situation.contributions = (contributions ?? []).reduce(
      (sum, c) => sum + Number(c.amount),
      0,
    );
  }

  // Épargne / tontine / prêts via les membres de groupe liés au compte.
  const { data: groupMembers } = await supabase
    .from("group_members")
    .select("id, group_id")
    .eq("user_id", userId);
  const myGroupMembers = groupMembers ?? [];
  const gmIds = myGroupMembers.map((g) => g.id);
  if (gmIds.length > 0) {
    const { data: payments } = await supabase
      .from("group_payments")
      .select("amount, group_id")
      .in("member_id", gmIds)
      .eq("status", "confirmed");

    const groupIds = [...new Set(myGroupMembers.map((g) => g.group_id))];
    const { data: groups } = await supabase
      .from("financial_groups")
      .select("id, type")
      .in("id", groupIds);
    const typeById = new Map<string, string>(
      (groups ?? []).map((g) => [g.id, g.type]),
    );

    for (const p of payments ?? []) {
      const amount = Number(p.amount);
      if (typeById.get(p.group_id) === "tontine") situation.tontine += amount;
      else situation.savings += amount;
    }

    // Prêts en cours : approuvés, part non remboursée.
    const { data: loans } = await supabase
      .from("loans")
      .select("total_due, repaid_amount")
      .in("member_id", gmIds)
      .eq("status", "approved");
    situation.loans_outstanding = (loans ?? []).reduce(
      (sum, l) => sum + (Number(l.total_due) - Number(l.repaid_amount)),
      0,
    );
  }

  // Aides reçues : cas sociaux (financés/décaissés) dont le bénéficiaire
  // est lié au compte.
  const { data: aids } = await supabase
    .from("social_cases")
    .select("collected_amount")
    .eq("beneficiary_user_id", userId)
    .in("status", ["funded", "disbursed"]);
  situation.aids_received = (aids ?? []).reduce(
    (sum, c) => sum + Number(c.collected_amount),
    0,
  );

  return situation;
}
