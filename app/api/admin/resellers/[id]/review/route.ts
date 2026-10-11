import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { getAdminContext } from "@/lib/api/admin-auth";
import { payRpcErrorResponse } from "@/lib/api/pay-rpc";
import { isUuid } from "@/lib/pay-transfer";

const VALID = ["approved", "rejected"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { id } = await params;
  const { status } = (await request.json().catch(() => ({}))) as { status?: string };

  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
  }

  // RG-M01 : la décision passe par la fonction SQL
  // market_review_reseller_application, appelée avec la session de
  // l'administrateur (et non le client service_role) : elle revérifie
  // platform_admins, crée le compte revendeur et journalise dans
  // admin_audit_logs dans la même transaction.
  const authed = await getAuthedContext();
  if ("response" in authed) return authed.response;
  const { error } = await authed.supabase.rpc("market_review_reseller_application", {
    p_application_id: id,
    p_status: status,
  });
  if (error) return payRpcErrorResponse(error);

  try {
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
