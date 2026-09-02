import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    let { data: wallet } = await supabase
      .from("market_wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!wallet) {
      const { data: created, error } = await supabase
        .from("market_wallets")
        .insert({ user_id: user.id, balance: 0, currency: "GNF" })
        .select()
        .single();
      if (error) throw error;
      wallet = created;
    }

    return NextResponse.json({
      balance: wallet.balance,
      currency: wallet.currency,
    });
  } catch (err) {
    return apiError(err);
  }
}
