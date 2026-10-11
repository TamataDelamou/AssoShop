import { env } from "./env.ts";
import { json } from "./http.ts";

// Garde-fou « argent réel » (cahier, RG-P01 / RG-P07). Tant que le partenaire
// agréé qui détient les fonds n'est pas choisi, aucune opération en argent
// réel ne doit aboutir.
//
// Une Edge Function déployée est considérée en PRODUCTION par défaut : le
// garde-fou bloque sauf si PAY_REAL_MONEY vaut exactement « 1 ». Seul le
// projet de test, qui déclare APP_ENV=test, laisse passer les parcours de
// test (aucun argent réel n'y circule).

type Env = (name: string) => string | undefined;

export const PAY_TEST_MODE_MESSAGE =
  "Paiements en mode test : les opérations en argent réel (recharge, retrait Mobile Money) ne sont pas encore ouvertes.";

export function isRealMoneyEnabled(read: Env = env): boolean {
  return read("PAY_REAL_MONEY")?.trim() === "1";
}

export function isTestEnvironment(read: Env = env): boolean {
  return read("APP_ENV")?.trim() === "test";
}

export function isRealMoneyBlocked(read: Env = env): boolean {
  return !isRealMoneyEnabled(read) && !isTestEnvironment(read);
}

export function realMoneyBlockedResponse(): Response {
  return json({ error: PAY_TEST_MODE_MESSAGE, code: "pay_test_mode" }, 503);
}
