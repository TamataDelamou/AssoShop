import { NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { orderId } = await params;

  // Vérification de l'acheteur, contrôle du solde, débit du portefeuille et
  // passage de la commande à « payée » dans la fonction SQL atomique
  // market_pay_order.
  const { data, error } = await supabase.rpc("market_pay_order", {
    p_order_id: orderId,
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
