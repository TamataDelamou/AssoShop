import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

type JoinedGroup = {
  id: string;
  product_id: string | null;
  min_participants: number;
  deadline: string;
  unit_price: number;
  currency: string;
  status: string;
};

type Named<T> = T | T[] | null | undefined;

function first<T>(value: Named<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { groupId } = await params;

  // Inscription de l'utilisateur courant et passage éventuel à « confirmée »
  // (RG-M02) dans la fonction SQL market_join_group_order : aucun utilisateur
  // ne modifie plus directement la commande groupée.
  const { data, error } = await supabase.rpc("market_join_group_order", {
    p_group_id: groupId,
  });
  if (error) return payRpcErrorResponse(error);

  const group = rpcRow<JoinedGroup>(data);
  if (!group) return payRpcErrorResponse(null);

  try {
    const { data: details } = await supabase
      .from("market_group_orders")
      .select("market_products(name), market_resellers(company_name)")
      .eq("id", groupId)
      .maybeSingle();

    const { count, error: countError } = await supabase
      .from("market_group_order_participants")
      .select("*", { count: "exact", head: true })
      .eq("group_order_id", groupId);
    if (countError) throw countError;

    const product = first(details?.market_products as Named<{ name: string }>);
    const reseller = first(
      details?.market_resellers as Named<{ company_name: string }>,
    );

    return NextResponse.json({
      id: group.id,
      product_id: group.product_id,
      product_name: product?.name ?? "",
      reseller_name: reseller?.company_name ?? "",
      min_participants: group.min_participants,
      participants: count ?? 0,
      deadline: group.deadline,
      unit_price: group.unit_price,
      currency: group.currency,
      status: group.status,
      joined: true,
    });
  } catch (err) {
    return apiError(err);
  }
}
