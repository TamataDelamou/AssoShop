import { createHash, timingSafeEqual } from "crypto";

// Confirmation des recharges (migration 0019) : pay_topup crée une transaction
// « pending », seul le serveur peut la confirmer via pay_confirm_topup.

type Env = Record<string, string | undefined>;

// Secret du webhook de l'opérateur Mobile Money. Absent = route désactivée.
export function getPayWebhookSecret(env: Env = process.env): string | null {
  const secret = env.PAY_WEBHOOK_SECRET?.trim();
  return secret ? secret : null;
}

// Comparaison à temps constant du secret présenté (en-tête Authorization: Bearer).
export function isValidWebhookSecret(
  authorization: string | null,
  secret: string,
): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  const provided = createHash("sha256").update(authorization.slice(7)).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(provided, expected);
}

// Confirmation automatique de la démo : uniquement hors production ET hors
// backend réel (NEXT_PUBLIC_USE_REAL_API≠1). Jamais ailleurs, sinon n'importe
// quel utilisateur pourrait se créditer sans paiement.
export function canAutoConfirmTopup(env: Env = process.env): boolean {
  return env.NODE_ENV !== "production" && env.NEXT_PUBLIC_USE_REAL_API !== "1";
}
