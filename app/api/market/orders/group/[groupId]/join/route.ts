import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;
  const { groupId } = await params;

  try {
    const { data: group, error } = await supabase
      .from("market_group_orders")
      .select("*, market_products(name), market_resellers(company_name)")
      .eq("id", groupId)
      .maybeSingle();
    if (error) throw error;
    if (!group) {
      return NextResponse.json({ error: "Commande groupée introuvable" }, { status: 404 });
    }

    if (group.status === "open") {
      await supabase.from("market_group_order_participants").upsert(
        { group_order_id: groupId, user_id: user.id },
        { onConflict: "group_order_id,user_id" },
      );
    }

    const { count, error: countError } = await supabase
      .from("market_group_order_participants")
      .select("*", { count: "exact", head: true })
      .eq("group_order_id", groupId);
    if (countError) throw countError;

    const participants = count ?? 0;
    let status = group.status;
    if (status === "open") {
      const deadlinePassed = new Date(group.deadline).getTime() < Date.now();
      if (participants >= group.min_participants || deadlinePassed) {
        status = "confirmed";
        await supabase
          .from("market_group_orders")
          .update({ status })
          .eq("id", groupId);
      }
    }

    return NextResponse.json({
      id: group.id,
      product_id: group.product_id,
      product_name: group.market_products?.name ?? "",
      reseller_name: group.market_resellers?.company_name ?? "",
      min_participants: group.min_participants,
      participants,
      deadline: group.deadline,
      unit_price: group.unit_price,
      currency: group.currency,
      status,
      joined: true,
    });
  } catch (err) {
    return apiError(err);
  }
}
