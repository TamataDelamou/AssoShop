import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { parseAmount, payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";
import { investorShares } from "@/lib/market-investments";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    const [projects, contributions, distributions, myShares, rate] = await Promise.all([
      supabase
        .from("market_investment_projects")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("market_investment_contributions")
        .select("project_id, user_id, amount, refunded_at")
        .order("created_at"),
      supabase
        .from("market_investment_distributions")
        .select("id, project_id, amount, distributed_amount, status, declared_at")
        .order("declared_at", { ascending: false }),
      // RLS : uniquement les parts de l'utilisateur (et celles de ses projets).
      supabase
        .from("market_investment_distribution_shares")
        .select("distribution_id, user_id, amount"),
      supabase.rpc("market_investment_commission_rate"),
    ]);
    if (projects.error) throw projects.error;
    if (contributions.error) throw contributions.error;
    if (distributions.error) throw distributions.error;
    if (myShares.error) throw myShares.error;

    const commissionRate =
      rate.error || rate.data === null || rate.data === undefined
        ? null
        : Number(rate.data);

    const myShareByDistribution: Record<string, number> = {};
    for (const s of myShares.data ?? []) {
      if (s.user_id === user.id) myShareByDistribution[s.distribution_id] = s.amount;
    }

    return NextResponse.json(
      (projects.data ?? []).map((project) => {
        const projectContributions = (contributions.data ?? []).filter(
          (c) => c.project_id === project.id,
        );
        const myContribution = projectContributions
          .filter((c) => c.user_id === user.id)
          .reduce((sum, c) => sum + c.amount, 0);
        // Les identifiants des autres investisseurs ne quittent pas le serveur.
        const { created_by: createdBy, ...rest } = project;
        return {
          ...rest,
          my_contribution: myContribution,
          is_owner: createdBy === user.id,
          commission_rate: commissionRate,
          shares: investorShares(projectContributions, user.id),
          distributions: (distributions.data ?? [])
            .filter((d) => d.project_id === project.id)
            .map((d) => ({
              id: d.id,
              amount: d.amount,
              distributed_amount: d.distributed_amount,
              status: d.status,
              declared_at: d.declared_at,
              my_share: myShareByDistribution[d.id] ?? 0,
            })),
        };
      }),
    );
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    description?: string;
    sector?: string;
    target_amount?: number;
    currency?: string;
    profit_sharing_rules?: string;
    deadline?: string;
  } | null;

  if (!payload?.name?.trim()) {
    return NextResponse.json({ error: "Nom du projet requis" }, { status: 400 });
  }
  const target = parseAmount(payload.target_amount);
  if (target === null) {
    return NextResponse.json({ error: "Montant recherché invalide" }, { status: 400 });
  }
  if (typeof payload.deadline !== "string" || !ISO_DATE.test(payload.deadline)) {
    return NextResponse.json({ error: "Date limite requise" }, { status: 400 });
  }

  // Le créateur est enregistré par la fonction SQL : lui seul pourra modifier
  // les règles de répartition, et seulement avant le premier investissement.
  // La date limite fixe l'échéance du séquestre (tout ou rien).
  const { data, error } = await supabase.rpc("market_create_investment_project", {
    p_name: payload.name,
    p_description: payload.description ?? "",
    p_sector: payload.sector ?? "",
    p_target_amount: target,
    p_currency: payload.currency ?? "GNF",
    p_profit_sharing_rules: payload.profit_sharing_rules ?? "",
    p_deadline: payload.deadline,
  });
  if (error) return payRpcErrorResponse(error);

  const project = { ...(rpcRow<Record<string, unknown>>(data) ?? {}) };
  delete project.created_by;
  return NextResponse.json({
    ...project,
    my_contribution: 0,
    is_owner: true,
    commission_rate: null,
    shares: [],
    distributions: [],
  });
}
