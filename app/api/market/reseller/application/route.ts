import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    company_name?: string;
    contact_name?: string;
    id_document?: string;
    sector?: string;
    country?: string;
    city?: string;
  } | null;

  if (!payload?.company_name?.trim() || !payload?.contact_name?.trim()) {
    return NextResponse.json(
      { error: "Raison sociale et contact requis" },
      { status: 400 },
    );
  }

  // Le statut est fixé à « pending » par la fonction SQL : le candidat ne peut
  // plus écrire directement sa candidature. La décision appartient à un
  // administrateur de la plateforme (RG-M01, /api/admin/resellers/[id]/review).
  const { data, error } = await supabase.rpc("market_submit_reseller_application", {
    p_company_name: payload.company_name,
    p_contact_name: payload.contact_name,
    p_id_document: payload.id_document ?? "",
    p_sector: payload.sector ?? "",
    p_country: payload.country ?? "",
    p_city: payload.city ?? "",
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
