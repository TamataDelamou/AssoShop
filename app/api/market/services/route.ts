import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function GET() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  try {
    const [services, reviews] = await Promise.all([
      supabase
        .from("market_services")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("market_service_reviews")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (services.error) throw services.error;
    if (reviews.error) throw reviews.error;

    const reviewsByService: Record<string, unknown[]> = {};
    for (const review of reviews.data ?? []) {
      (reviewsByService[review.service_id] ??= []).push(review);
    }

    return NextResponse.json(
      (services.data ?? []).map((service) => ({
        ...service,
        reviews: reviewsByService[service.id] ?? [],
      })),
    );
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    provider_name?: string;
    provider_member?: boolean;
    service_type?: string;
    title?: string;
    description?: string;
    price?: number;
    currency?: string;
    country?: string;
    city?: string;
  } | null;

  try {
    if (!payload?.title?.trim()) {
      return NextResponse.json({ error: "Titre du service requis" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("market_services")
      .insert({
        provider_user_id: user.id,
        provider_name: payload.provider_name ?? "",
        provider_member: payload.provider_member ?? false,
        service_type: payload.service_type ?? "",
        title: payload.title,
        description: payload.description ?? "",
        price: payload.price ?? 0,
        currency: payload.currency ?? "GNF",
        country: payload.country ?? "",
        city: payload.city ?? "",
        rating: 0,
        reviews_count: 0,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ...data, reviews: [] });
  } catch (err) {
    return apiError(err);
  }
}
