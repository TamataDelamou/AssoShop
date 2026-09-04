import { afterEach, describe, expect, it, vi } from "vitest";
import { aiAssistant } from "@/lib/ai/assistant";

const realFetch = globalThis.fetch;

function mockFetchResponse(body: unknown, ok = true): void {
  globalThis.fetch = vi.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("aiAssistant — intents rédactionnels", () => {
  it("retombe sur la synthèse locale quand le fournisseur est indisponible", async () => {
    mockFetchResponse({ error: "AI_NOT_CONFIGURED" }, false);
    const result = await aiAssistant.synthesizeMinutes(
      "Réunion du 4/09\nDécision : valider le budget\nAction : préparer la kermesse",
    );
    expect(result.source).toBe("fallback");
    expect(result.draft).toContain("Points abordés");
    expect(result.draft).toContain("Décisions");
    expect(result.draft).toContain("Actions à suivre");
  });

  it("utilise le fournisseur quand il répond", async () => {
    mockFetchResponse({ text: "CR généré par l'IA" });
    const result = await aiAssistant.synthesizeMinutes("notes");
    expect(result.source).toBe("ai");
    expect(result.draft).toBe("CR généré par l'IA");
  });

  it("chat : fallback déterministe sans clé", async () => {
    mockFetchResponse({ error: "AI_NOT_CONFIGURED" }, false);
    const result = await aiAssistant.ask("Comment payer ma cotisation ?");
    expect(result.source).toBe("fallback");
    expect(result.answer).toContain("cotisation");
  });
});

describe("aiAssistant — intents décisionnels (JSON + garde-fous)", () => {
  it("risque : accepte le JSON valide du LLM", async () => {
    mockFetchResponse({
      text: JSON.stringify({
        flagged: [{ id: "m1", name: "A", reason: "Retard" }],
      }),
    });
    const result = await aiAssistant.detectAtRiskMembers([
      { id: "m1", name: "A", engagement: "regular", lastPaymentAt: null },
    ]);
    expect(result.source).toBe("ai");
    expect(result.flagged).toHaveLength(1);
    expect(result.flagged[0].id).toBe("m1");
  });

  it("risque : rejette un id inconnu → fallback", async () => {
    mockFetchResponse({
      text: JSON.stringify({
        flagged: [{ id: "INCONNU", name: "X", reason: "?" }],
      }),
    });
    const result = await aiAssistant.detectAtRiskMembers([
      { id: "m1", name: "A", engagement: "regular", lastPaymentAt: null },
    ]);
    expect(result.source).toBe("fallback");
  });

  it("prêt : borne le montant à l'épargne totale", async () => {
    mockFetchResponse({ text: JSON.stringify({ suggested: 9999999 }) });
    const result = await aiAssistant.suggestLoanAmount({
      totalSaved: 500000,
      engagement: "reliable",
      monthsActive: 6,
    });
    expect(result.source).toBe("fallback");
    expect(result.suggested).toBeGreaterThanOrEqual(0);
  });

  it("prêt : accepte un montant valide et l'arrondit au millier", async () => {
    mockFetchResponse({ text: JSON.stringify({ suggested: 123456 }) });
    const result = await aiAssistant.suggestLoanAmount({
      totalSaved: 500000,
      engagement: "reliable",
      monthsActive: 6,
    });
    expect(result.source).toBe("ai");
    expect(result.suggested).toBe(123000);
  });

  it("rapprochement : valide les entry_id contre l'entrée", async () => {
    mockFetchResponse({
      text: JSON.stringify({
        flags: [
          { entry_id: "e1", note: "Écart" },
          { entry_id: "FAKE", note: "?" },
        ],
      }),
    });
    const result = await aiAssistant.flagReconciliationDiscrepancies([
      { id: "e1", amount: 100, operator_reference: "", status: "unmatched" },
    ]);
    expect(result.source).toBe("fallback");
  });
});
