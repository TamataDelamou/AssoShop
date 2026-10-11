import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { parseAmount, payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

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

  const amount = parseAmount(payload?.amount);
  if (amount === null) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  // Contribution, montant collecté et verrouillage des règles (RG-M05) dans la
  // fonction SQL market_invest : le projet n'est plus modifiable directement.
  const { data, error } = await supabase.rpc("market_invest", {
    p_project_id: projectId,
    p_amount: amount,
  });
  if (error) return payRpcErrorResponse(error);

  try {
    const { data: myContributions, error: contributionsError } = await supabase
      .from("market_investment_contributions")
      .select("amount")
      .eq("project_id", projectId)
      .eq("user_id", user.id);
    if (contributionsError) throw contributionsError;

    const myContribution = (myContributions ?? []).reduce(
      (sum, c) => sum + c.amount,
      0,
    );

    return NextResponse.json({
      ...rpcRow<Record<string, unknown>>(data),
      my_contribution: myContribution,
    });
  } catch (err) {
    return apiError(err);
  }
}
