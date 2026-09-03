import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    const results = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("memberships").select("organization_id, role").eq("user_id", user.id),
      supabase
        .from("hub_favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("hub_vault")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("hub_kyc")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false }),
      supabase
        .from("hub_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("hub_preferences").select("*").eq("user_id", user.id).order("event_type"),
      supabase
        .from("hub_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("hub_referrals")
        .select("*")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false }),
      supabase
        .from("hub_sync_queue")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pay_transactions")
        .select("type, amount, created_at")
        .eq("user_id", user.id),
    ]);
    for (const r of results) {
      if (r.error) throw r.error;
    }

    const [
      profile,
      memberships,
      favorites,
      vault,
      kyc,
      notifications,
      preferences,
      conversations,
      referrals,
      syncQueue,
      payTxs,
    ] = results;

    const orgIds = (memberships.data ?? []).map((m) => m.organization_id);
    const orgNames: Record<string, { name: string; type: string }> = {};
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, type")
        .in("id", orgIds);
      for (const o of orgs ?? []) {
        orgNames[o.id] = { name: o.name, type: o.type };
      }
    }

    const membershipList = (memberships.data ?? []).map((m) => ({
      id: m.organization_id,
      kind: "association",
      name: orgNames[m.organization_id]?.name ?? "",
      type: orgNames[m.organization_id]?.type ?? "",
      role: m.role === "admin" ? "Administrateur" : "Membre",
      status: "active",
    }));

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartIso = monthStart.toISOString();
    const txs = payTxs.data ?? [];
    const monthlyIncome = txs
      .filter((t) => t.type === "topup" && t.created_at >= monthStartIso)
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);
    const monthlyExpenses = txs
      .filter((t) => t.type === "withdrawal" && t.created_at >= monthStartIso)
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);

    const p = profile.data;

    return NextResponse.json({
      profile: {
        id: user.id,
        name: (user.user_metadata?.full_name as string) ?? user.email ?? "",
        phone: user.phone ?? "",
        email: user.email ?? "",
        city: p?.city ?? "",
        country: "Guinée",
        language: p?.language ?? "Français",
        engagement: p?.engagement ?? "reliable",
        trust_score: p?.trust_score ?? 0,
        kyc_status: p?.kyc_status ?? "not_submitted",
        joined_at: user.created_at,
      },
      home: {
        associations_count: membershipList.length,
        groups_count: 0,
        pending_invitations: 0,
        monthly_income: monthlyIncome,
        monthly_expenses: monthlyExpenses,
        currency: "GNF",
      },
      memberships: membershipList,
      favorites: favorites.data ?? [],
      vault: vault.data ?? [],
      kyc: kyc.data ?? [],
      notifications: notifications.data ?? [],
      preferences: preferences.data ?? [],
      conversations: conversations.data ?? [],
      referrals: referrals.data ?? [],
      sync_queue: syncQueue.data ?? [],
    });
  } catch (err) {
    return apiError(err);
  }
}
