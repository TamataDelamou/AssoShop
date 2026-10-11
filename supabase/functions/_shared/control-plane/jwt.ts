// Porté de lib/control-plane/jwt.ts (application Next.js de référence) pour les
// Edge Functions Supabase. Même logique ; seuls les imports et l'accès aux
// variables d'environnement changent.
import { Buffer } from "node:buffer";
import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomUUID,
  sign as cryptoSign,
  timingSafeEqual,
  verify as cryptoVerify,
  type KeyObject,
} from "node:crypto";

// ---------------------------------------------------------------------------
// Jetons JWT inter-services (AssoShop <-> Control Plane GSG).
// Implémentation sans dépendance (node:crypto) : HS256, RS256, ES256, EdDSA.
//
// Règles de sécurité appliquées à la vérification :
//  - l'algorithme est imposé par la clé configurée (pas de confusion d'alg,
//    « none » refusé) ;
//  - iss, aud, exp, nbf et iat sont obligatoirement contrôlés ;
//  - durée de vie maximale bornée (jetons courts) ;
//  - scopes requis vérifiés ;
//  - jti obligatoire (l'anti-rejeu est fait par l'appelant, en base).
// ---------------------------------------------------------------------------

export type JwtAlg = "HS256" | "RS256" | "ES256" | "EdDSA";

/** Clé de signature/vérification : secret partagé ou clé PEM. */
export type JwtKey =
  | { kind: "secret"; secret: string }
  | { kind: "pem"; pem: string };

export interface ServiceClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  iat: number;
  nbf?: number;
  exp: number;
  jti: string;
  scope: string;
  [claim: string]: unknown;
}

export interface SignInput {
  issuer: string;
  subject: string;
  audience: string;
  scopes: string[];
  ttlSeconds: number;
  extraClaims?: Record<string, unknown>;
}

export interface VerifyOptions {
  issuer: string;
  audience: string;
  requiredScopes?: string[];
  clockToleranceSeconds?: number;
  maxTtlSeconds?: number;
  now?: number;
}

export type VerifyResult =
  | { ok: true; claims: ServiceClaims }
  | { ok: false; reason: string };

const DEFAULT_CLOCK_TOLERANCE_S = 30;
const DEFAULT_MAX_TTL_S = 600;

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function algForAsymmetricKey(key: KeyObject): JwtAlg {
  switch (key.asymmetricKeyType) {
    case "rsa":
      return "RS256";
    case "ed25519":
      return "EdDSA";
    case "ec": {
      const curve = key.asymmetricKeyDetails?.namedCurve;
      if (curve === "prime256v1" || curve === "P-256") return "ES256";
      throw new Error(`Courbe EC non supportée : ${curve ?? "inconnue"}`);
    }
    default:
      throw new Error(
        `Type de clé non supporté : ${key.asymmetricKeyType ?? "inconnu"}`,
      );
  }
}

function asymmetricSign(alg: JwtAlg, data: Buffer, key: KeyObject): Buffer {
  if (alg === "EdDSA") return cryptoSign(null, data, key);
  if (alg === "ES256") {
    return cryptoSign("sha256", data, { key, dsaEncoding: "ieee-p1363" });
  }
  return cryptoSign("sha256", data, key);
}

function asymmetricVerify(
  alg: JwtAlg,
  data: Buffer,
  key: KeyObject,
  signature: Buffer,
): boolean {
  if (alg === "EdDSA") return cryptoVerify(null, data, key, signature);
  if (alg === "ES256") {
    return cryptoVerify(
      "sha256",
      data,
      { key, dsaEncoding: "ieee-p1363" },
      signature,
    );
  }
  return cryptoVerify("sha256", data, key, signature);
}

/** Signe un jeton de service à courte durée de vie. */
export function signServiceToken(
  input: SignInput,
  key: JwtKey,
  now: number = Date.now(),
): string {
  const iat = Math.floor(now / 1000);
  const claims: ServiceClaims = {
    ...input.extraClaims,
    iss: input.issuer,
    sub: input.subject,
    aud: input.audience,
    iat,
    nbf: iat,
    exp: iat + input.ttlSeconds,
    jti: randomUUID(),
    scope: input.scopes.join(" "),
  };

  let alg: JwtAlg;
  let privateKey: KeyObject | null = null;
  if (key.kind === "secret") {
    alg = "HS256";
  } else {
    privateKey = createPrivateKey(key.pem);
    alg = algForAsymmetricKey(privateKey);
  }

  const header = b64url(JSON.stringify({ alg, typ: "JWT" }));
  const payload = b64url(JSON.stringify(claims));
  const signingInput = Buffer.from(`${header}.${payload}`);

  const signature =
    key.kind === "secret"
      ? createHmac("sha256", key.secret).update(signingInput).digest()
      : asymmetricSign(alg, signingInput, privateKey as KeyObject);

  return `${header}.${payload}.${b64url(signature)}`;
}

/** Vérifie un jeton de service entrant (signature + claims + scopes). */
export function verifyServiceToken(
  token: string,
  key: JwtKey,
  options: VerifyOptions,
): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "format_invalide" };
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; typ?: string };
  let claims: ServiceClaims;
  try {
    header = JSON.parse(fromB64url(headerB64).toString("utf8"));
    claims = JSON.parse(fromB64url(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "format_invalide" };
  }

  // L'algorithme attendu est déduit de la clé, jamais du jeton.
  let expectedAlg: JwtAlg;
  let publicKey: KeyObject | null = null;
  try {
    if (key.kind === "secret") {
      expectedAlg = "HS256";
    } else {
      publicKey = createPublicKey(key.pem);
      expectedAlg = algForAsymmetricKey(publicKey);
    }
  } catch {
    return { ok: false, reason: "cle_invalide" };
  }
  if (header.alg !== expectedAlg) return { ok: false, reason: "alg_refuse" };

  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`);
  const signature = fromB64url(signatureB64);

  let validSignature: boolean;
  if (key.kind === "secret") {
    const expected = createHmac("sha256", key.secret)
      .update(signingInput)
      .digest();
    validSignature =
      expected.length === signature.length &&
      timingSafeEqual(expected, signature);
  } else {
    try {
      validSignature = asymmetricVerify(
        expectedAlg,
        signingInput,
        publicKey as KeyObject,
        signature,
      );
    } catch {
      validSignature = false;
    }
  }
  if (!validSignature) return { ok: false, reason: "signature_invalide" };

  const nowS = Math.floor((options.now ?? Date.now()) / 1000);
  const tolerance = options.clockToleranceSeconds ?? DEFAULT_CLOCK_TOLERANCE_S;
  const maxTtl = options.maxTtlSeconds ?? DEFAULT_MAX_TTL_S;

  if (typeof claims.exp !== "number" || typeof claims.iat !== "number") {
    return { ok: false, reason: "claims_manquants" };
  }
  if (typeof claims.jti !== "string" || claims.jti.length === 0) {
    return { ok: false, reason: "jti_manquant" };
  }
  if (claims.exp + tolerance < nowS) return { ok: false, reason: "expire" };
  if (claims.iat - tolerance > nowS) return { ok: false, reason: "iat_futur" };
  if (typeof claims.nbf === "number" && claims.nbf - tolerance > nowS) {
    return { ok: false, reason: "pas_encore_valide" };
  }
  if (claims.exp - claims.iat > maxTtl) {
    return { ok: false, reason: "duree_trop_longue" };
  }
  if (claims.iss !== options.issuer) return { ok: false, reason: "iss_refuse" };

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(options.audience)) {
    return { ok: false, reason: "aud_refuse" };
  }

  const granted = new Set(
    typeof claims.scope === "string" ? claims.scope.split(" ") : [],
  );
  for (const scope of options.requiredScopes ?? []) {
    if (!granted.has(scope)) return { ok: false, reason: "scope_insuffisant" };
  }

  return { ok: true, claims };
}
