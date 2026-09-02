import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { serviceId } = await params;

  const payload = (await request.json().catch(() => null)) as {
    author_name?: string;
    rating?: number;
    comment?: string;
    solicited?: boolean;
  } | null;

  try {
    // RG-M04 : seules les personnes ayant sollicité le service peuvent l'évaluer.
    if (!payload?.solicited) {
      return NextResponse.json(
        { error: "Seuls les bénéficiaires du service peuvent l'évaluer" },
        { status: 400 },
      );
    }

    const { data: service } = await supabase
      .from("market_services")
      .select("*")
      .eq("id", serviceId)
      .maybeSingle();
    if (!service) {
      return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
    }

    const rating = Math.max(1, Math.min(5, payload.rating ?? 5));

    const { data: review, error } = await supabase
      .from("market_service_reviews")
      .insert({
        service_id: serviceId,
        author_name: payload.author_name ?? "",
        rating,
        comment: payload.comment ?? "",
        solicited: true,
      })
      .select()
      .single();
    if (error) throw error;

    const reviewsCount = (service.reviews_count ?? 0) + 1;
    const newRating =
      (Number(service.rating ?? 0) * (reviewsCount - 1) + rating) / reviewsCount;
    await supabase
      .from("market_services")
      .update({ reviews_count: reviewsCount, rating: newRating })
      .eq("id", serviceId);

    return NextResponse.json(review);
  } catch (err) {
    return apiError(err);
  }
}
