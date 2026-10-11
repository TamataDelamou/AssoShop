import type { SupabaseClient } from "@supabase/supabase-js";
import { secret } from "../_shared/env.ts";
import { isValidBearerSecret, json, readJson } from "../_shared/http.ts";
import { mapPayRpcError } from "../_shared/pay-errors.ts";
import { isRealMoneyBlocked, realMoneyBlockedResponse } from "../_shared/real-money.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";

// POST /functions/v1/pay-topup-confirm  { "reference": "PAY-2026-XXXXXXXX" }
// Webhook de l'opérateur Mobile Money : confirme une recharge « pending » et
// crédite le portefeuille (fonction SQL pay_confirm_topup).
//
// - Désactivée par défaut : sans PAY_WEBHOOK_SECRET, la fonction répond 404.
// - Serveur à serveur uniquement : Authorization: Bearer <PAY_WEBHOOK_SECRET>.
//   Un jeton d'utilisateur n'est jamais accepté.
// - Refusée (503) tant que PAY_REAL_MONEY n'est pas activé, hors projet de test.
// - Idempotente : rejouer la même référence ne crédite pas une seconde fois.

export interface Deps {
  createAdminClient: () => SupabaseClient;
}

const defaults: Deps = { createAdminClient: createSupabaseAdminClient };

export async function handle(request: Request, deps: Deps = defaults): Promise<Response> {
  const webhookSecret = secret("PAY_WEBHOOK_SECRET");
  if (!webhookSecret) return json({ error: "Introuvable" }, 404);
  if (request.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  if (!isValidBearerSecret(request, webhookSecret)) return json({ error: "Non autorisé" }, 401);
  if (isRealMoneyBlocked()) return realMoneyBlockedResponse();

  const payload = await readJson<{ reference?: unknown }>(request);
  const reference = typeof payload?.reference === "string" ? payload.reference.trim() : "";
  if (!reference) return json({ error: "Référence requise" }, 400);

  const { data, error } = await deps
    .createAdminClient()
    .rpc("pay_confirm_topup", { p_reference: reference });
  if (error) {
    const { status, message } = mapPayRpcError(error);
    return json({ error: message }, status);
  }
  return json(Array.isArray(data) ? data[0] : data);
}
