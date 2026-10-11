import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

type GroupOrderRow = {
  id: string;
  product_id: string | null;
  reseller_id: string | null;
  min_participants: number;
  deadline: string;
  unit_price: number;
  currency: string;
  status: string;
  market_products: { name: string } | null;
  market_resellers: { company_name: string } | null;
};

function refreshedStatus(
  status: string,
  participants: number,
  minParticipants: number,
  deadline: string,
): string {
  if (status !== "open") return status;
  const deadlinePassed = new Date(deadline).getTime() < Date.now();
  return participants >= minParticipants || deadlinePassed ? "confirmed" : "open";
}

export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    const { data: groups, error } = await supabase
      .from("market_group_orders")
      .select("*, market_products(name), market_resellers(company_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const list = (groups ?? []) as GroupOrderRow[];
    const { data: participants, error: participantsError } = await supabase
      .from("market_group_order_participants")
      .select("group_order_id, user_id");
    if (participantsError) throw participantsError;

    return NextResponse.json(
      list.map((group) => {
        const rows = (participants ?? []).filter(
          (p) => p.group_order_id === group.id,
        );
        const count = rows.length;
        return {
          id: group.id,
          product_id: group.product_id,
          product_name: group.market_products?.name ?? "",
          reseller_name: group.market_resellers?.company_name ?? "",
          min_participants: group.min_participants,
          participants: count,
          deadline: group.deadline,
          unit_price: group.unit_price,
          currency: group.currency,
          status: refreshedStatus(
            group.status,
            count,
            group.min_participants,
            group.deadline,
          ),
          joined: rows.some((p) => p.user_id === user.id),
        };
      }),
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
    product_id?: string;
    min_participants?: number;
    deadline?: string;
  } | null;

  if (!payload?.product_id) {
    return NextResponse.json({ error: "Produit requis" }, { status: 400 });
  }

  // Prix, devise et revendeur viennent du produit : la fonction SQL
  // market_create_group_order ignore tout prix envoyé par le navigateur.
  const { data, error } = await supabase.rpc("market_create_group_order", {
    p_product_id: payload.product_id,
    p_min_participants: payload.min_participants ?? 1,
    p_deadline: payload.deadline ?? null,
  });
  if (error) return payRpcErrorResponse(error);

  const group = rpcRow<GroupOrderRow>(data);
  if (!group) return payRpcErrorResponse(null);

  try {
    const { data: product } = await supabase
      .from("market_products")
      .select("name, market_resellers(company_name)")
      .eq("id", payload.product_id)
      .maybeSingle();
    const reseller = product?.market_resellers as
      | { company_name: string }
      | { company_name: string }[]
      | null
      | undefined;

    return NextResponse.json({
      ...group,
      product_name: product?.name ?? "",
      reseller_name:
        (Array.isArray(reseller) ? reseller[0]?.company_name : reseller?.company_name) ?? "",
      participants: 1,
      joined: true,
    });
  } catch (err) {
    return apiError(err);
  }
}
