import { NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

// Annulation par l'acheteur d'une commande non payée.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { orderId } = await params;

  // Propriété de la commande et état « non payée » contrôlés par la fonction
  // SQL market_cancel_order.
  const { data, error } = await supabase.rpc("market_cancel_order", {
    p_order_id: orderId,
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
