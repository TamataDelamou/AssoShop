import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    delivery_zones?: string[];
    delivery_slots?: string[];
    payment_details?: string;
  } | null;

  try {
    const { data: reseller } = await supabase
      .from("market_resellers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!reseller) {
      return NextResponse.json(
        { error: "Compte revendeur requis" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("market_reseller_settings")
      .upsert(
        {
          reseller_id: reseller.id,
          delivery_zones: payload?.delivery_zones ?? [],
          delivery_slots: payload?.delivery_slots ?? [],
          payment_details: payload?.payment_details ?? "",
        },
        { onConflict: "reseller_id" },
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({
      delivery_zones: data.delivery_zones ?? [],
      delivery_slots: data.delivery_slots ?? [],
      payment_details: data.payment_details ?? "",
    });
  } catch (err) {
    return apiError(err);
  }
}
