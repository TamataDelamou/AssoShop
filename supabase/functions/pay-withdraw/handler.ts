import type { SupabaseClient, User } from "@supabase/supabase-js";
import { CORS_HEADERS, json, readJson } from "../_shared/http.ts";
import { mapPayRpcError } from "../_shared/pay-errors.ts";
import {
  isRealMoneyBlocked,
  isRealMoneyEnabled,
  realMoneyBlockedResponse,
} from "../_shared/real-money.ts";
import { createSupabaseAdminClient, userFromRequest } from "../_shared/supabase.ts";

// POST /functions/v1/pay-withdraw  { "amount": 5000, "provider": "Orange Money", "wallet_id"?: "…" }
// Retrait du portefeuille vers Mobile Money. C'est le SEUL chemin vers la
// fonction SQL pay_withdraw, qui n'est plus appelable par un client
// (migration 0027) : c'est ici que viendra l'appel à l'opérateur.
//
// - Appel authentifié par le jeton Supabase de l'utilisateur ; le compte
//   débité est celui du jeton, jamais un identifiant fourni par le client.
// - Refusé (503 pay_test_mode) tant que PAY_REAL_MONEY n'est pas activé, hors
//   projet de test.
// - Refusé (503 payout_unavailable) en argent réel : aucun opérateur n'est
//   encore intégré, et débiter sans verser serait une perte pour l'utilisateur.
//   Seul le projet de test (APP_ENV=test, soldes fictifs) va jusqu'au débit.

export interface Deps {
  getUser: (request: Request) => Promise<User | null>;
  createAdminClient: () => SupabaseClient;
}

const defaults: Deps = { getUser: userFromRequest, createAdminClient: createSupabaseAdminClient };

const reply = (body: unknown, status = 200) => json(body, status, CORS_HEADERS);

const MAX_AMOUNT = 2_147_483_647;

export async function handle(request: Request, deps: Deps = defaults): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== "POST") return reply({ error: "Méthode non autorisée" }, 405);

  const user = await deps.getUser(request);
  if (!user) return reply({ error: "Non authentifié" }, 401);

  if (isRealMoneyBlocked()) {
    const blocked = realMoneyBlockedResponse();
    return reply(await blocked.json(), blocked.status);
  }
  if (isRealMoneyEnabled()) {
    return reply(
      {
        error: "Retrait indisponible : aucun opérateur Mobile Money n'est encore intégré.",
        code: "payout_unavailable",
      },
      503,
    );
  }

  const payload = await readJson<{ amount?: unknown; provider?: unknown; wallet_id?: unknown }>(request);
  const amount = payload?.amount;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    return reply({ error: "Montant invalide" }, 400);
  }

  const { data, error } = await deps.createAdminClient().rpc("pay_withdraw", {
    p_user_id: user.id,
    p_amount: amount,
    p_wallet_id: typeof payload?.wallet_id === "string" ? payload.wallet_id : null,
    p_provider: typeof payload?.provider === "string" ? payload.provider : "",
  });
  if (error) {
    const { status, message } = mapPayRpcError(error);
    return reply({ error: message }, status);
  }
  return reply(Array.isArray(data) ? data[0] : data);
}
