import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    const [projects, contributions] = await Promise.all([
      supabase
        .from("market_investment_projects")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("market_investment_contributions")
        .select("project_id, user_id, amount"),
    ]);
    if (projects.error) throw projects.error;
    if (contributions.error) throw contributions.error;

    const myByProject: Record<string, number> = {};
    for (const c of contributions.data ?? []) {
      if (c.user_id === user.id) {
        myByProject[c.project_id] = (myByProject[c.project_id] ?? 0) + c.amount;
      }
    }

    return NextResponse.json(
      (projects.data ?? []).map((project) => ({
        ...project,
        my_contribution: myByProject[project.id] ?? 0,
      })),
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
  } | null;

  if (!payload?.name?.trim()) {
    return NextResponse.json({ error: "Nom du projet requis" }, { status: 400 });
  }

  // Le créateur est enregistré par la fonction SQL : lui seul pourra modifier
  // les règles de répartition, et seulement avant le premier investissement.
  const { data, error } = await supabase.rpc("market_create_investment_project", {
    p_name: payload.name,
    p_description: payload.description ?? "",
    p_sector: payload.sector ?? "",
    p_target_amount: payload.target_amount ?? 0,
    p_currency: payload.currency ?? "GNF",
    p_profit_sharing_rules: payload.profit_sharing_rules ?? "",
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json({ ...rpcRow<Record<string, unknown>>(data), my_contribution: 0 });
}
