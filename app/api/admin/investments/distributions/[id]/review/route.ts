import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { getAdminContext } from "@/lib/api/admin-auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";
import { isUuid } from "@/lib/pay-transfer";

const VALID = ["approved", "rejected"];

// POST /api/admin/investments/distributions/[id]/review  { "status": "approved" }
// Validation d'un bénéfice déclaré par un porteur de projet. La fonction SQL
// market_review_investment_profit est appelée avec la session de
// l'administrateur (et non le client service_role) : elle revérifie
// platform_admins, débite le porteur, crédite chaque investisseur au prorata
// de sa mise et journalise, dans la même transaction.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { id } = await params;
  const { status } = (await request.json().catch(() => ({}))) as { status?: string };

  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Déclaration introuvable" }, { status: 404 });
  }

  const authed = await getAuthedContext();
  if ("response" in authed) return authed.response;
  const { data, error } = await authed.supabase.rpc("market_review_investment_profit", {
    p_distribution_id: id,
    p_status: status,
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(rpcRow(data));
}
