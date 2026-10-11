import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { parseAmount, payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";
import { isUuid } from "@/lib/pay-transfer";

// POST /api/market/investments/[projectId]/profit  { "amount": 50000 }
// Le porteur d'un projet financé déclare un bénéfice à distribuer. Aucun
// mouvement de fonds ici : la répartition au prorata des mises n'a lieu
// qu'après validation par un administrateur de la plateforme.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { projectId } = await params;

  const payload = (await request.json().catch(() => null)) as {
    amount?: number;
  } | null;

  const amount = parseAmount(payload?.amount);
  if (amount === null) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }
  if (!isUuid(projectId)) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const { data, error } = await supabase.rpc("market_declare_investment_profit", {
    p_project_id: projectId,
    p_amount: amount,
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
