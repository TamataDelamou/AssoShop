import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canManageMembers, isOrgAdmin } from "@/lib/api/org-admin";
import { mapPayRpcError, parseAmount, rpcRow } from "@/lib/api/pay-rpc";

// Client Supabase minimal : renvoie la ligne memberships fournie et note les filtres.
function fakeSupabase(
  result: { data: unknown; error: unknown },
  filters: Record<string, unknown> = {},
): SupabaseClient {
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      filters[column] = value;
      return builder;
    },
    maybeSingle: async () => result,
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

describe("Contrôle des rôles membres", () => {
  it("autorise uniquement le rôle admin", () => {
    expect(canManageMembers({ role: "admin" })).toBe(true);
    expect(canManageMembers({ role: "member" })).toBe(false);
    expect(canManageMembers({ role: "Admin" })).toBe(false);
    expect(canManageMembers({ role: null })).toBe(false);
    expect(canManageMembers({})).toBe(false);
  });

  it("refuse en l'absence d'adhésion", () => {
    expect(canManageMembers(null)).toBe(false);
    expect(canManageMembers(undefined)).toBe(false);
  });

  it("reconnaît un admin de l'organisation ciblée", async () => {
    const filters: Record<string, unknown> = {};
    const supabase = fakeSupabase({ data: { role: "admin" }, error: null }, filters);
    expect(await isOrgAdmin(supabase, "org-1", "user-1")).toBe(true);
    expect(filters).toEqual({ organization_id: "org-1", user_id: "user-1" });
  });

  it("refuse un simple membre ou un non-membre", async () => {
    const member = fakeSupabase({ data: { role: "member" }, error: null });
    const outsider = fakeSupabase({ data: null, error: null });
    expect(await isOrgAdmin(member, "org-1", "user-1")).toBe(false);
    expect(await isOrgAdmin(outsider, "org-1", "user-1")).toBe(false);
  });

  it("refuse si la lecture de l'adhésion échoue", async () => {
    const supabase = fakeSupabase({
      data: { role: "admin" },
      error: { message: "boom" },
    });
    expect(await isOrgAdmin(supabase, "org-1", "user-1")).toBe(false);
  });
});

describe("Portefeuilles : validation du montant", () => {
  it("accepte un entier strictement positif", () => {
    expect(parseAmount(1)).toBe(1);
    expect(parseAmount(50000)).toBe(50000);
  });

  it("rejette zéro, les négatifs et les décimaux", () => {
    expect(parseAmount(0)).toBeNull();
    expect(parseAmount(-100)).toBeNull();
    expect(parseAmount(10.5)).toBeNull();
  });

  it("rejette les valeurs non numériques ou hors bornes", () => {
    expect(parseAmount("100")).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(Number.NaN)).toBeNull();
    expect(parseAmount(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseAmount(2_147_483_648)).toBeNull();
  });
});

describe("Portefeuilles : erreurs des fonctions SQL", () => {
  it("traduit les codes métier en statut HTTP", () => {
    expect(mapPayRpcError({ code: "PY001" })).toEqual({ status: 400, message: "Montant invalide" });
    expect(mapPayRpcError({ code: "PY002" }).status).toBe(404);
    expect(mapPayRpcError({ code: "PY003" })).toEqual({ status: 400, message: "Solde insuffisant" });
    expect(mapPayRpcError({ code: "PY004" }).status).toBe(401);
    expect(mapPayRpcError({ code: "PY005" }).status).toBe(404);
    expect(mapPayRpcError({ code: "PY006" }).status).toBe(403);
    expect(mapPayRpcError({ code: "PY007" }).status).toBe(400);
  });

  it("masque le détail des erreurs inconnues", () => {
    const failure = mapPayRpcError({
      code: "42501",
      message: "permission denied for table pay_wallets",
    });
    expect(failure).toEqual({ status: 500, message: "Erreur interne" });
    expect(mapPayRpcError(null).status).toBe(500);
    expect(mapPayRpcError("boom").status).toBe(500);
  });

  it("normalise la ligne renvoyée par une fonction SQL", () => {
    expect(rpcRow({ id: "a" })).toEqual({ id: "a" });
    expect(rpcRow([{ id: "a" }])).toEqual({ id: "a" });
    expect(rpcRow(null)).toBeNull();
    expect(rpcRow([])).toBeNull();
  });
});
