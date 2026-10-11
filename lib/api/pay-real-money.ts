import { NextResponse } from "next/server";

// Garde-fou « argent réel ». Tant que le partenaire agréé détenant les fonds
// n'est pas choisi (cahier, RG-P01 / RG-P07), la plateforme ne doit ni
// encaisser ni décaisser d'argent réel : l'interrupteur serveur PAY_REAL_MONEY
// est désactivé par défaut et, en production, bloque la confirmation des
// recharges par webhook et les retraits vers Mobile Money.

type Env = Record<string, string | undefined>;

export const PAY_TEST_MODE_MESSAGE =
  "Paiements en mode test : les opérations en argent réel (recharge, retrait Mobile Money) ne sont pas encore ouvertes.";

// Activé uniquement par la valeur exacte « 1 ».
export function isRealMoneyEnabled(env: Env = process.env): boolean {
  return env.PAY_REAL_MONEY?.trim() === "1";
}

// Vrai quand une opération en argent réel doit être refusée : en production,
// interrupteur désactivé. Hors production, les parcours de test restent
// possibles (aucun argent réel n'y circule).
export function isRealMoneyBlocked(env: Env = process.env): boolean {
  return env.NODE_ENV === "production" && !isRealMoneyEnabled(env);
}

// Réponse commune aux routes bloquées.
export function realMoneyBlockedResponse(): NextResponse {
  return NextResponse.json(
    { error: PAY_TEST_MODE_MESSAGE, code: "pay_test_mode" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
