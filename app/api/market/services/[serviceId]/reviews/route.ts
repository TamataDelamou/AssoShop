import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { rpcRow, throwRpcError } from "@/lib/api/pay-rpc";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { serviceId } = await params;

  const payload = (await request.json().catch(() => null)) as {
    rating?: number;
    comment?: string;
  } | null;

  try {
    // RG-M04 : seule une personne ayant sollicité le service peut l'évaluer.
    // La vérification n'est plus déclarative : la fonction SQL
    // market_review_service (migration 0027) exige une sollicitation
    // confirmée par le prestataire, et recalcule la note du service.
    const { data, error } = await ctx.supabase.rpc("market_review_service", {
      p_service_id: serviceId,
      p_rating: Math.round(payload?.rating ?? 5),
      p_comment: payload?.comment ?? "",
    });
    if (error) throwRpcError(error);

    return NextResponse.json(rpcRow(data));
  } catch (err) {
    return apiError(err);
  }
}
