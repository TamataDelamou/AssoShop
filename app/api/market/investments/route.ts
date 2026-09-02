import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

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

  try {
    if (!payload?.name?.trim()) {
      return NextResponse.json({ error: "Nom du projet requis" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("market_investment_projects")
      .insert({
        name: payload.name,
        description: payload.description ?? "",
        sector: payload.sector ?? "",
        target_amount: payload.target_amount ?? 0,
        raised_amount: 0,
        currency: payload.currency ?? "GNF",
        profit_sharing_rules: payload.profit_sharing_rules ?? "",
        rules_locked: false,
        status: "open",
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ...data, my_contribution: 0 });
  } catch (err) {
    return apiError(err);
  }
}
