import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;
  const { projectId } = await params;

  const payload = (await request.json().catch(() => null)) as {
    amount?: number;
  } | null;

  try {
    const amount = payload?.amount ?? 0;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const { data: project } = await supabase
      .from("market_investment_projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();
    if (!project) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }
    if (project.status !== "open") {
      return NextResponse.json(
        { error: "Le projet n'est plus ouvert à l'investissement" },
        { status: 400 },
      );
    }

    const raisedAmount = project.raised_amount + amount;
    const status = raisedAmount >= project.target_amount ? "completed" : "open";

    const { data: updated, error: updateError } = await supabase
      .from("market_investment_projects")
      .update({ raised_amount: raisedAmount, rules_locked: true, status })
      .eq("id", projectId)
      .select()
      .single();
    if (updateError) throw updateError;

    await supabase.from("market_investment_contributions").insert({
      project_id: projectId,
      user_id: user.id,
      amount,
    });

    const { data: myContributions } = await supabase
      .from("market_investment_contributions")
      .select("amount")
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    const myContribution = (myContributions ?? []).reduce(
      (sum, c) => sum + c.amount,
      0,
    );

    return NextResponse.json({ ...updated, my_contribution: myContribution });
  } catch (err) {
    return apiError(err);
  }
}
