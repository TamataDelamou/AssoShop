import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    provider?: string;
    phone?: string;
  } | null;

  try {
    if (!payload?.provider?.trim() || !payload?.phone?.trim()) {
      return NextResponse.json(
        { error: "Opérateur et numéro requis" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("pay_methods")
      .insert({
        user_id: user.id,
        provider: payload.provider,
        phone: payload.phone,
        is_default: false,
        country: "Guinée",
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return apiError(err);
  }
}
