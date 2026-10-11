import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getControlPlaneConfig, type ControlPlaneConfig } from "@/lib/control-plane/config";
import {
  buildBatchBody,
  computeBackoffMs,
  flushOutbox,
  idempotencyKey,
  postToKernel,
  type OutboxRow,
} from "@/lib/control-plane/exporter";
import { checkMtls } from "@/lib/control-plane/guard";
import { signServiceToken, verifyServiceToken, type JwtKey } from "@/lib/control-plane/jwt";

const SECRET: JwtKey = { kind: "secret", secret: "s".repeat(48) };

function sign(key: JwtKey, overrides: Partial<Parameters<typeof signServiceToken>[0]> = {}, now?: number) {
  return signServiceToken(
    {
      issuer: "gsg-kernel",
      subject: "dashboard",
      audience: "assoshop",
      scopes: ["metrics:read"],
      ttlSeconds: 60,
      ...overrides,
    },
    key,
    now,
  );
}

const verifyOpts = { issuer: "gsg-kernel", audience: "assoshop", requiredScopes: ["metrics:read"] };

describe("JWT inter-services", () => {
  it("signe et vérifie un jeton HS256", () => {
    const res = verifyServiceToken(sign(SECRET), SECRET, verifyOpts);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.claims.sub).toBe("dashboard");
      expect(res.claims.jti).toBeTruthy();
    }
  });

  it("rejette un mauvais secret", () => {
    const res = verifyServiceToken(sign(SECRET), { kind: "secret", secret: "x".repeat(48) }, verifyOpts);
    expect(res).toEqual({ ok: false, reason: "signature_invalide" });
  });

  it("rejette un jeton expiré", () => {
    const old = Date.now() - 10 * 60 * 1000;
    const res = verifyServiceToken(sign(SECRET, {}, old), SECRET, verifyOpts);
    expect(res).toEqual({ ok: false, reason: "expire" });
  });

  it("rejette une durée de vie trop longue", () => {
    const res = verifyServiceToken(sign(SECRET, { ttlSeconds: 3600 }), SECRET, verifyOpts);
    expect(res).toEqual({ ok: false, reason: "duree_trop_longue" });
  });

  it("contrôle émetteur, audience et scopes", () => {
    expect(verifyServiceToken(sign(SECRET, { issuer: "autre" }), SECRET, verifyOpts)).toEqual({ ok: false, reason: "iss_refuse" });
    expect(verifyServiceToken(sign(SECRET, { audience: "ecoshop" }), SECRET, verifyOpts)).toEqual({ ok: false, reason: "aud_refuse" });
    expect(verifyServiceToken(sign(SECRET, { scopes: ["health:read"] }), SECRET, verifyOpts)).toEqual({ ok: false, reason: "scope_insuffisant" });
  });

  it("refuse alg=none et la confusion d'algorithme", () => {
    const token = sign(SECRET);
    const [, payload] = token.split(".");
    const none = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${payload}.`;
    expect(verifyServiceToken(none, SECRET, verifyOpts)).toEqual({ ok: false, reason: "alg_refuse" });

    const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
    // Jeton HS256 présenté à une instance configurée en RS256.
    expect(verifyServiceToken(token, { kind: "pem", pem }, verifyOpts)).toEqual({ ok: false, reason: "alg_refuse" });
  });

  it.each([
    ["RS256", () => generateKeyPairSync("rsa", { modulusLength: 2048 })],
    ["ES256", () => generateKeyPairSync("ec", { namedCurve: "prime256v1" })],
    ["EdDSA", () => generateKeyPairSync("ed25519")],
  ])("signe et vérifie en %s", (alg, gen) => {
    const { privateKey, publicKey } = gen();
    const priv: JwtKey = { kind: "pem", pem: privateKey.export({ type: "pkcs8", format: "pem" }).toString() };
    const pub: JwtKey = { kind: "pem", pem: publicKey.export({ type: "spki", format: "pem" }).toString() };
    const token = sign(priv);
    expect(JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString()).alg).toBe(alg);
    expect(verifyServiceToken(token, pub, verifyOpts).ok).toBe(true);
  });
});

describe("Configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ignore un secret trop court et normalise les PEM sur une ligne", () => {
    vi.stubEnv("CONTROL_PLANE_INBOUND_SECRET", "court");
    vi.stubEnv("CONTROL_PLANE_OUTBOUND_PRIVATE_KEY", "-----BEGIN X-----\\nabc\\n-----END X-----");
    const cfg = getControlPlaneConfig();
    expect(cfg.inboundKey).toBeNull();
    expect(cfg.outboundKey).toEqual({ kind: "pem", pem: "-----BEGIN X-----\nabc\n-----END X-----" });
    expect(cfg.enabled).toBe(false);
  });
});

function config(overrides: Partial<ControlPlaneConfig> = {}): ControlPlaneConfig {
  return {
    enabled: true,
    serviceId: "assoshop",
    instanceId: "assoshop-gn",
    kernelIssuer: "gsg-kernel",
    metricsIngestUrl: "https://kernel.test/ingest/metrics",
    auditIngestUrl: "https://kernel.test/ingest/audit",
    outboundKey: SECRET,
    inboundKey: SECRET,
    mtlsHeader: null,
    mtlsFingerprints: [],
    cronSecret: null,
    ...overrides,
  };
}

describe("mTLS", () => {
  it("accepte une empreinte autorisée quel que soit le format", () => {
    const cfg = config({ mtlsHeader: "x-client-cert-fingerprint", mtlsFingerprints: ["ab:cd:ef"] });
    const ok = new Request("https://a.test", { headers: { "x-client-cert-fingerprint": "ABCDEF" } });
    const ko = new Request("https://a.test", { headers: { "x-client-cert-fingerprint": "123456" } });
    expect(checkMtls(ok, cfg)).toBe(true);
    expect(checkMtls(ko, cfg)).toBe(false);
    expect(checkMtls(new Request("https://a.test"), cfg)).toBe(false);
    expect(checkMtls(new Request("https://a.test"), config())).toBe(true);
  });
});

describe("Export vers le Kernel", () => {
  it("calcule un rejeu exponentiel plafonné", () => {
    expect(computeBackoffMs(1)).toBe(30_000);
    expect(computeBackoffMs(2)).toBe(60_000);
    expect(computeBackoffMs(50)).toBe(6 * 60 * 60 * 1000);
  });

  it("produit une clé d'idempotence indépendante de l'ordre", () => {
    expect(idempotencyKey(["b", "a"])).toBe(idempotencyKey(["a", "b"]));
  });

  it("construit les enveloppes audit et métriques", () => {
    const rows: OutboxRow[] = [{ id: "1", kind: "audit_log", payload: { source: "admin" }, attempts: 0 }];
    const body = buildBatchBody("audit_log", rows, config());
    expect(body).toMatchObject({ schema: "gsg.audit.v1", service: "assoshop", events: [{ outbox_id: "1", source: "admin" }] });
  });

  it("envoie un jeton signé vérifiable par le Kernel", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    const res = await postToKernel("https://kernel.test/x", { a: 1 }, ["1"], "audit:write", config(), fetchMock);
    expect(res.ok).toBe(true);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const auth = (init.headers as Record<string, string>).Authorization.replace("Bearer ", "");
    const check = verifyServiceToken(auth, SECRET, { issuer: "assoshop", audience: "gsg-kernel", requiredScopes: ["audit:write"] });
    expect(check.ok).toBe(true);
  });

  it("vide la file : envoyé, échec avec rejeu, endpoint absent", async () => {
    const rows: OutboxRow[] = [
      { id: "a1", kind: "audit_log", payload: {}, attempts: 0 },
      { id: "m1", kind: "metrics_snapshot", payload: {}, attempts: 9 },
    ];
    const updates: Array<{ values: Record<string, unknown> }> = [];
    const chain = {
      update(values: Record<string, unknown>) {
        updates.push({ values });
        return { in: async () => ({}), eq: async () => ({}) };
      },
    };
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: rows, error: null }),
      from: () => chain,
    } as never;

    const fetchMock = vi.fn(async (url: string) =>
      new Response(null, { status: url.includes("audit") ? 200 : 500 }),
    );
    const report = await flushOutbox(supabase, config(), fetchMock as never);
    expect(report).toMatchObject({ claimed: 2, sent: 1, retried: 0, failed: 1 });
    expect(updates.some((u) => u.values.status === "sent")).toBe(true);
    expect(updates.some((u) => u.values.status === "failed" && u.values.attempts === 10)).toBe(true);

    const skipped = await flushOutbox(supabase, config({ metricsIngestUrl: null }), fetchMock as never);
    expect(skipped.skipped).toEqual(["metrics_snapshot"]);
  });
});
