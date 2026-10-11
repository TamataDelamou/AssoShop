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
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  // La décision passe par la fonction SQL admin_review_kyc (0025), appelée
  // avec la session de l'administrateur : elle revérifie platform_admins,
  // reporte la décision sur la demande et le profil de l'utilisateur, et
  // journalise. C'est la fonction qu'appelle le back-office Flutter.
  const authed = await getAuthedContext();
  if ("response" in authed) return authed.response;
  const { error } = await authed.supabase.rpc("admin_review_kyc", {
    p_kyc_id: id,
    p_status: status,
  });
  if (error) return payRpcErrorResponse(error);

  try {
    const { data: list } = await supabase
      .from("admin_kyc")
      .select("*")
      .order("submitted_at", { ascending: false });
    return NextResponse.json(list ?? []);
  } catch (err) {
    return apiError(err);
  }
}
