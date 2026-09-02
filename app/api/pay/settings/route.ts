import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    default_provider?: string;
    max_transaction_amount?: number;
    alerts_enabled?: boolean;
  } | null;

  try {
    const { data, error } = await supabase
      .from("pay_settings")
      .upsert(
        {
          user_id: user.id,
          default_provider: payload?.default_provider ?? "",
          max_transaction_amount: payload?.max_transaction_amount ?? 5000000,
          alerts_enabled: payload?.alerts_enabled ?? true,
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({
      default_provider: data.default_provider ?? "",
      max_transaction_amount: data.max_transaction_amount ?? 5000000,
      alerts_enabled: data.alerts_enabled ?? true,
    });
  } catch (err) {
    return apiError(err);
  }
}
