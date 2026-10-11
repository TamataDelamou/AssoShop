import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";
import { isManualAdvanceStatus } from "@/lib/market-orders";

// Avancement logistique déclaré par le revendeur : expédiée, puis arrivée.
// « Prête au retrait » passe par le scan du colis (RG-M03) et « livrée » par
// la remise au client : routes scan et deliver.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { orderId } = await params;

  const payload = (await request.json().catch(() => null)) as {
    status?: unknown;
  } | null;
  const status = payload?.status;
  if (!isManualAdvanceStatus(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  // Propriété du revendeur et ordre des étapes contrôlés par la fonction SQL
  // market_advance_order.
  const { data, error } = await supabase.rpc("market_advance_order", {
    p_order_id: orderId,
    p_status: status,
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
