import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";
import { OrderStatus } from "@/types/modules/market";

// Remise du colis au client : prête au retrait → livrée.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { orderId } = await params;

  const payload = (await request.json().catch(() => null)) as {
    recipient_name?: string;
  } | null;

  // Propriété du revendeur, transition autorisée et suivi de retrait sont
  // contrôlés par la fonction SQL market_advance_order.
  const { data, error } = await supabase.rpc("market_advance_order", {
    p_order_id: orderId,
    p_status: OrderStatus.DELIVERED,
    p_recipient_name: payload?.recipient_name ?? null,
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
