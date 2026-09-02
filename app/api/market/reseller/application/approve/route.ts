import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

// NOTE : l'approbation est ici effectuée par l'utilisateur sur sa propre
// candidature (parité avec le flux démo). À durcir ultérieurement avec un
// rôle administrateur plateforme.
export async function POST() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    const { data: application } = await supabase
      .from("market_reseller_applications")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!application) {
      return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
    }

    const { data: approved, error } = await supabase
      .from("market_reseller_applications")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", application.id)
      .select()
      .single();
    if (error) throw error;

    const { data: existing } = await supabase
      .from("market_resellers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { data: created, error: createError } = await supabase
        .from("market_resellers")
        .insert({
          user_id: user.id,
          company_name: application.company_name,
          country: application.country,
          city: application.city,
          sector: application.sector,
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

    return NextResponse.json(approved);
  } catch (err) {
    return apiError(err);
  }
}
