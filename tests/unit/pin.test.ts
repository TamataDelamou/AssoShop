import { describe, expect, it } from "vitest";
import { pinResponse } from "@/lib/pin";

// Le PIN est créé et vérifié en base (migration 0025) ; ce module traduit
// seulement l'état renvoyé par pin_set / pin_verify pour les routes Next.js.
describe("PIN : traduction de la réponse de la base", () => {
  it("accepte un PIN correct", () => {
    expect(pinResponse({ ok: true })).toEqual({ status: 200, body: { ok: true } });
    expect(pinResponse([{ ok: true }])).toEqual({ status: 200, body: { ok: true } });
  });

  it("signale un format invalide", () => {
    expect(pinResponse({ ok: false, reason: "invalid_format" })).toEqual({
      status: 400,
      body: { error: "INVALID_PIN" },
    });
  });

  it("refuse un PIN incorrect en donnant les essais restants", () => {
    expect(pinResponse({ ok: false, reason: "incorrect", attempts_left: 3 })).toEqual({
      status: 401,
      body: { error: "INCORRECT_PIN", attempts_left: 3 },
    });
    expect(pinResponse({ ok: false, reason: "no_pin" }).status).toBe(401);
  });

  it("signale le verrouillage et son échéance", () => {
    expect(
      pinResponse({ ok: false, reason: "locked", locked_until: "2026-10-11T12:00:00Z" }),
    ).toEqual({
      status: 429,
      body: { error: "PIN_LOCKED", locked_until: "2026-10-11T12:00:00Z" },
    });
  });

  it("ne considère jamais une réponse illisible comme un succès", () => {
    expect(pinResponse(null).status).toBe(500);
    expect(pinResponse({}).status).toBe(500);
    expect(pinResponse({ ok: "true" }).status).toBe(500);
  });
});
