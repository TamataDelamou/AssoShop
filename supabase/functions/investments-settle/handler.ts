import type { SupabaseClient } from "@supabase/supabase-js";
import { secret } from "../_shared/env.ts";
import { isValidBearerSecret, json } from "../_shared/http.ts";
import { settleDueInvestments } from "../_shared/settlement.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";

// GET|POST /functions/v1/investments-settle
// Dénoue les séquestres d'investissement échus : versement au porteur
// (commission déduite) si l'objectif est atteint, remboursement intégral des
// investisseurs sinon.
//
// La planification normale est faite EN BASE par pg_cron (migration 0026),
// sans passer par cette fonction. Elle sert à déclencher un dénouement à la
// demande (exploitation, tests) ou depuis un planificateur externe.
//
// - Désactivée par défaut : sans CRON_SECRET, la fonction répond 404.
// - Serveur à serveur uniquement : Authorization: Bearer <CRON_SECRET>.
// - Idempotente : un projet déjà dénoué n'est jamais versé ni remboursé une
//   seconde fois.

export interface Deps {
  createAdminClient: () => SupabaseClient;
}

const defaults: Deps = { createAdminClient: createSupabaseAdminClient };

export async function handle(request: Request, deps: Deps = defaults): Promise<Response> {
  const cronSecret = secret("CRON_SECRET");
  if (!cronSecret) return json({ error: "Introuvable" }, 404);
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Méthode non autorisée" }, 405);
  }
  if (!isValidBearerSecret(request, cronSecret)) return json({ error: "Non autorisé" }, 401);

  const report = await settleDueInvestments(deps.createAdminClient());
  const failed = Boolean(report.error) || report.failed.length > 0;
  // 500 si un projet n'a pas pu être dénoué : l'appelant le signale.
  return json(report, failed ? 500 : 200);
}
