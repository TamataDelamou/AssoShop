import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { getAdminContext } from "@/lib/api/admin-auth";

const MODULE_LABELS: Record<string, { label: string; metric: string }> = {
  community: { label: "Community", metric: "Cotisations" },
  finance: { label: "Finance", metric: "Épargne collectée" },
  market: { label: "Market", metric: "Volume d'affaires" },
  pay: { label: "Pay", metric: "Transactions" },
};

function monthLabel(): string {
  return new Date().toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export async function GET() {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  try {
    const results = await Promise.all([
      supabase.from("organizations").select("id", { count: "exact", head: true }),
      supabase.from("financial_groups").select("id", { count: "exact", head: true }),
      supabase
        .from("market_reseller_applications")
        .select("*")
        .order("submitted_at", { ascending: false }),
      supabase.from("admin_kyc").select("*").order("submitted_at", { ascending: false }),
      supabase
        .from("admin_moderation")
        .select("*")
        .order("reported_at", { ascending: false }),
      supabase.from("admin_disputes").select("*").order("opened_at", { ascending: false }),
      supabase.from("memberships").select("organization_id"),
      supabase.from("group_members").select("group_id"),
      supabase.from("admin_roles").select("*").order("name"),
      supabase.from("admin_commissions").select("*").order("service"),
      supabase.from("admin_plans").select("*").order("monthly_price"),
      supabase.from("admin_config").select("*").eq("id", 1).maybeSingle(),
      supabase.from("admin_countries").select("*").order("name"),
      supabase.from("admin_operators").select("*").order("name"),
      supabase.from("admin_integrations").select("*").order("name"),
      supabase.from("admin_insurance").select("*").order("insurer"),
      supabase.from("admin_invoices").select("*").order("due_at"),
      supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("admin_security_audit")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
      supabase.from("financial_groups").select("*").order("created_at", { ascending: false }),
      supabase.from("market_products").select("category_id, subcategory_id"),
      supabase.from("market_product_categories").select("*").order("name"),
      supabase
        .from("market_investment_projects")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("pay_transactions").select("amount, commission, module, created_at"),
    ]);
    for (const r of results) {
      if (r.error) throw r.error;
    }

    // Portefeuille plateforme : lisible uniquement avec le client service_role.
    const { data: platformWallet } = await supabase
      .from("pay_wallets")
      .select("balance, currency")
      .eq("type", "platform")
      .maybeSingle();

    const [
      orgCountRes,
      groupCountRes,
      resellerApps,
      kyc,
      moderation,
      disputes,
      memberships,
      groupMembers,
      roles,
      commissions,
      plans,
      config,
      countries,
      operators,
      integrations,
      insurance,
      invoices,
      auditLogs,
      securityAudit,
      organizations,
      groups,
      products,
      categories,
      investments,
      payTxs,
    ] = results;

    let users: unknown[] = [];
    let activeUsers = 0;
    try {
      const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      users = (data?.users ?? []).map((u) => ({
        id: u.id,
        name: (u.user_metadata?.full_name as string) ?? u.email ?? "",
        email: u.email ?? "",
        phone: u.phone ?? "",
        role: "Membre",
        status: u.banned_until ? "suspended" : "active",
        created_at: u.created_at,
      }));
      activeUsers = users.length;
    } catch {
      users = [];
    }

    const pendingResellers = (resellerApps.data ?? []).filter(
      (r) => r.status === "pending",
    ).length;
    const pendingKyc = (kyc.data ?? []).filter((k) => k.status === "pending").length;
    const pendingModeration = (moderation.data ?? []).filter(
      (m) => m.status === "pending",
    ).length;
    const disputesOpen = (disputes.data ?? []).filter(
      (d) => d.status === "open",
    ).length;

    const orgMemberCounts: Record<string, number> = {};
    for (const m of memberships.data ?? []) {
      orgMemberCounts[m.organization_id] = (orgMemberCounts[m.organization_id] ?? 0) + 1;
    }
    const groupMemberCounts: Record<string, number> = {};
    for (const m of groupMembers.data ?? []) {
      groupMemberCounts[m.group_id] = (groupMemberCounts[m.group_id] ?? 0) + 1;
    }

    const productCounts: Record<string, number> = {};
    for (const p of products.data ?? []) {
      if (p.category_id) {
        productCounts[p.category_id] = (productCounts[p.category_id] ?? 0) + 1;
      }
      if (p.subcategory_id) {
        productCounts[p.subcategory_id] = (productCounts[p.subcategory_id] ?? 0) + 1;
      }
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartIso = monthStart.toISOString();
    const txs = payTxs.data ?? [];
    const monthlyVolume = txs
      .filter((t) => t.created_at >= monthStartIso)
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);
    const revenue = txs.reduce((sum, t) => sum + (t.commission ?? 0), 0);

    const cfg = config.data;
    const platformConfig = {
      platform_name: cfg?.platform_name ?? "AssoShop",
      support_email: cfg?.support_email ?? "",
      maintenance_mode: cfg?.maintenance_mode ?? false,
      cgu_version: cfg?.cgu_version ?? "",
      legal_text: cfg?.legal_text ?? "",
    };

    return NextResponse.json({
      dashboard: {
        active_users: activeUsers,
        associations_count: orgCountRes.count ?? 0,
        groups_count: groupCountRes.count ?? 0,
        monthly_volume: monthlyVolume,
        pending_validations: pendingResellers + pendingKyc + pendingModeration,
        disputes_open: disputesOpen,
        revenue,
        currency: "GNF",
      },
      reports: {
        period: monthLabel(),
        modules: ["community", "finance", "market", "pay"].map((m) => ({
          module: m,
          label: MODULE_LABELS[m]?.label ?? m,
          metric: MODULE_LABELS[m]?.metric ?? "",
          value: txs
            .filter((t) => t.module === m)
            .reduce((sum, t) => sum + (t.amount ?? 0), 0),
          trend: 0,
        })),
        top_countries: [],
      },
      national: [],
      audit_logs: auditLogs.data ?? [],
      security_audit: securityAudit.data ?? [],
      users,
      kyc: kyc.data ?? [],
      roles: roles.data ?? [],
      disputes: disputes.data ?? [],
      associations: (organizations.data ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        type: o.type,
        country: "",
        members_count: orgMemberCounts[o.id] ?? 0,
        status: o.status,
        reports: 0,
      })),
      groups: (groups.data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        type: g.type,
        country: "",
        members_count: groupMemberCounts[g.id] ?? 0,
        anomaly: false,
      })),
      hierarchy: [],
      solidarity: {
        total_collected: 0,
        covered_cases: 0,
        available: 0,
        currency: "GNF",
      },
      insurance: insurance.data ?? [],
      resellers: (resellerApps.data ?? []).map((r) => ({
        id: r.id,
        applicant_name: r.contact_name ?? "",
        business_name: r.company_name ?? "",
        country: r.country ?? "",
        status: r.status,
        submitted_at: r.submitted_at,
      })),
      categories: (categories.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        parent: c.parent_id ?? null,
        products_count: productCounts[c.id] ?? 0,
      })),
      moderation: moderation.data ?? [],
      investments: (investments.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        promoter: "",
        target_amount: p.target_amount,
        raised_amount: p.raised_amount,
        status: p.status,
        currency: p.currency,
      })),
      commissions: commissions.data ?? [],
      platform_wallet: platformWallet ?? null,
      plans: plans.data ?? [],
      invoices: invoices.data ?? [],
      config: platformConfig,
      countries: countries.data ?? [],
      operators: operators.data ?? [],
      integrations: integrations.data ?? [],
    });
  } catch (err) {
    return apiError(err);
  }
}
