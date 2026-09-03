import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { getAdminContext } from "@/lib/api/admin-auth";

const VALID = ["pending", "approved", "rejected"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { id } = await params;
  const { status } = (await request.json().catch(() => ({}))) as { status?: string };

  try {
    if (!status || !VALID.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const { data: app } = await supabase
      .from("market_reseller_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!app) {
      return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
    }

    await supabase
      .from("market_reseller_applications")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id);

    if (status === "approved" && app.user_id) {
      const { data: existing } = await supabase
        .from("market_resellers")
        .select("id")
        .eq("user_id", app.user_id)
        .maybeSingle();
      if (!existing) {
        const { data: created, error: createError } = await supabase
          .from("market_resellers")
          .insert({
            user_id: app.user_id,
            company_name: app.company_name,
            country: app.country,
            city: app.city,
            sector: app.sector,
            rating: 0,
            validated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (createError) throw createError;
        await supabase.from("market_reseller_settings").insert({
          reseller_id: created.id,
          delivery_zones: [],
          delivery_slots: [],
          payment_details: "",
        });
      }
    }

    const { data: list } = await supabase
      .from("market_reseller_applications")
      .select("*")
      .order("submitted_at", { ascending: false });

    return NextResponse.json(
      (list ?? []).map((r) => ({
        id: r.id,
        applicant_name: r.contact_name ?? "",
        business_name: r.company_name ?? "",
        country: r.country ?? "",
        status: r.status,
        submitted_at: r.submitted_at,
      })),
    );
  } catch (err) {
    return apiError(err);
  }
}
