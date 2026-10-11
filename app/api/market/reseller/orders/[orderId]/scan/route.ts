import { NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";
import { OrderStatus } from "@/types/modules/market";

// Scan du colis à la réception (RG-M03) : arrivée → prête au retrait.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { orderId } = await params;

  // Propriété du revendeur, transition autorisée et suivi de retrait sont
  // contrôlés par la fonction SQL market_advance_order.
  const { data, error } = await supabase.rpc("market_advance_order", {
    p_order_id: orderId,
    p_status: OrderStatus.READY_FOR_PICKUP,
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
