// Code PIN : depuis la migration 0025, l'empreinte (bcrypt), le compteur de
// tentatives et le verrouillage sont gérés en base par pin_set / pin_verify /
// pin_status, appelées telles quelles par l'application Flutter. Ce module ne
// fait plus que traduire leur réponse pour les routes Next.js de référence.

// Réponse de pin_set et pin_verify.
export interface PinResult {
  ok: boolean;
  // invalid_format | locked | no_pin | incorrect
  reason?: string;
  attempts_left?: number;
  locked_until?: string;
}

export interface PinHttpResponse {
  status: number;
  body: { ok: true } | { error: string; attempts_left?: number; locked_until?: string };
}

// Traduit l'état renvoyé par la base en réponse HTTP (contrat historique des
// routes /api/auth/set-pin et /api/auth/verify-pin).
export function pinResponse(data: unknown): PinHttpResponse {
  const result = (Array.isArray(data) ? data[0] : data) as PinResult | null;
  if (result?.ok === true) return { status: 200, body: { ok: true } };

  switch (result?.reason) {
    case "invalid_format":
      return { status: 400, body: { error: "INVALID_PIN" } };
    case "locked":
      return { status: 429, body: { error: "PIN_LOCKED", locked_until: result.locked_until } };
    case "incorrect":
      return { status: 401, body: { error: "INCORRECT_PIN", attempts_left: result.attempts_left } };
    case "no_pin":
      return { status: 401, body: { error: "INCORRECT_PIN" } };
    default:
      return { status: 500, body: { error: "INTERNAL" } };
  }
}
