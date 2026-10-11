import { NextResponse } from "next/server";
import {
  getCronSecret,
  isValidCronSecret,
  settleDueInvestments,
} from "@/lib/api/investment-settlement";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// /api/cron/investments/settle — dénoue les séquestres d'investissement échus :
// versement au porteur (commission déduite) si l'objectif est atteint,
// remboursement intégral des investisseurs sinon.
//
// - Désactivée par défaut : sans CRON_SECRET, la route répond 404.
// - Serveur à serveur uniquement : en-tête Authorization: Bearer <CRON_SECRET>.
//   Aucune session utilisateur n'est acceptée.
// - Idempotente : un projet déjà dénoué n'est jamais versé ni remboursé une
//   seconde fois ; la route peut être rejouée sans risque.
async function handle(request: Request) {
  const secret = getCronSecret();
  if (!secret) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (!isValidCronSecret(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const report = await settleDueInvestments(createSupabaseAdminClient());
  const failed = Boolean(report.error) || report.failed.length > 0;
  // 500 si un projet n'a pas pu être dénoué : le planificateur le signale.
  return NextResponse.json(report, {
    status: failed ? 500 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}

// GET : compatibilité avec les planificateurs qui n'émettent que des GET.
export const GET = handle;
export const POST = handle;
