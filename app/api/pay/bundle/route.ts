import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { getFinancialSituation } from "@/lib/api/situation";

export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    const [wallets, transactions, methods, reconciliation, settings] =
      await Promise.all([
        supabase
          .from("pay_wallets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at"),
        supabase
          .from("pay_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("pay_methods")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at"),
        supabase
          .from("pay_reconciliation")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("pay_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
    if (wallets.error) throw wallets.error;
    if (transactions.error) throw transactions.error;
    if (methods.error) throw methods.error;
    if (reconciliation.error) throw reconciliation.error;
    if (settings.error) throw settings.error;

    const settingsRow = settings.data;

    const situation = await getFinancialSituation(supabase, user.id);

    return NextResponse.json({
      wallets: wallets.data ?? [],
      transactions: transactions.data ?? [],
      methods: methods.data ?? [],
      reconciliation: reconciliation.data ?? [],
      situation,
      settings: {
        default_provider: settingsRow?.default_provider ?? "",
        max_transaction_amount: settingsRow?.max_transaction_amount ?? 5000000,
        alerts_enabled: settingsRow?.alerts_enabled ?? true,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
