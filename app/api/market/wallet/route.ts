import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { ensurePersonalWallet } from "@/lib/api/wallets";

export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    const wallet = await ensurePersonalWallet(supabase, user.id);
    return NextResponse.json({
      balance: wallet.balance,
      currency: wallet.currency,
    });
  } catch (err) {
    return apiError(err);
  }
}
