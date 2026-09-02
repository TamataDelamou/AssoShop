import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    company_name?: string;
    contact_name?: string;
    id_document?: string;
    sector?: string;
    country?: string;
    city?: string;
  } | null;

  try {
    if (!payload?.company_name?.trim() || !payload?.contact_name?.trim()) {
      return NextResponse.json(
        { error: "Raison sociale et contact requis" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("market_reseller_applications")
      .upsert(
        {
          user_id: user.id,
          company_name: payload.company_name,
          contact_name: payload.contact_name,
          id_document: payload.id_document ?? "",
          sector: payload.sector ?? "",
          country: payload.country ?? "",
          city: payload.city ?? "",
          status: "pending",
          review_notes: null,
          submitted_at: new Date().toISOString(),
          reviewed_at: null,
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return apiError(err);
  }
}
