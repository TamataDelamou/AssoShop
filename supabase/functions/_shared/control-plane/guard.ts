// Porté de lib/control-plane/guard.ts (application Next.js de référence) pour les
// Edge Functions Supabase. Même logique ; seuls les imports et l'accès aux
// variables d'environnement changent.
import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "../supabase.ts";
import {
  CP_DEFAULTS,
  getControlPlaneConfig,
  type ControlPlaneConfig,
} from "./config.ts";
import { verifyServiceToken, type ServiceClaims } from "./jwt.ts";

// ---------------------------------------------------------------------------
// Garde des endpoints interrogés par le Control Plane GSG.
// Chaîne de contrôle : activation -> mTLS (optionnel) -> JWT (signature,
// iss/aud/exp, scopes) -> anti-rejeu (jti à usage unique) -> journalisation.
// ---------------------------------------------------------------------------

export type ControlPlaneContext =
  | {
      ok: true;
      supabase: SupabaseClient;
      config: ControlPlaneConfig;
      claims: ServiceClaims | null;
    }
  | { ok: false; response: Response };

function deny(status: number, code: string): { ok: false; response: Response } {
  return {
    ok: false,
    response: Response.json(
      { error: code },
      { status, headers: { "Cache-Control": "no-store" } },
    ),
  };
}

function normalizeFingerprint(value: string): string {
  return value.toLowerCase().replace(/[^0-9a-f]/g, "");
}

/** Vérifie l'empreinte du certificat client transmise par la terminaison mTLS. */
export function checkMtls(request: Request, config: ControlPlaneConfig): boolean {
  if (!config.mtlsHeader) return true;
  const presented = request.headers.get(config.mtlsHeader);
  if (!presented) return false;
  const fp = normalizeFingerprint(presented);
  return config.mtlsFingerprints.map(normalizeFingerprint).includes(fp);
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

interface AuthorizeOptions {
  /** Autorise aussi le secret de planification (CRON_SECRET) à la place d'un JWT. */
  allowCronSecret?: boolean;
}

export async function authorizeControlPlane(
  request: Request,
  requiredScopes: string[],
  options: AuthorizeOptions = {},
): Promise<ControlPlaneContext> {
  const config = getControlPlaneConfig();

  // Intégration désactivée : les endpoints n'existent pas vu de l'extérieur.
  if (!config.enabled) return deny(404, "introuvable");

  const token = bearer(request);
  if (!token) return deny(401, "jeton_absent");

  // Déclenchement planifié interne (cron de la plateforme d'hébergement).
  if (options.allowCronSecret && config.cronSecret && safeEqual(token, config.cronSecret)) {
    return { ok: true, supabase: createSupabaseAdminClient(), config, claims: null };
  }

  if (!checkMtls(request, config)) return deny(401, "certificat_client_refuse");
  if (!config.inboundKey) return deny(503, "cle_entrante_non_configuree");

  const result = verifyServiceToken(token, config.inboundKey, {
    issuer: config.kernelIssuer,
    audience: config.serviceId,
    requiredScopes,
    clockToleranceSeconds: CP_DEFAULTS.CLOCK_TOLERANCE_SECONDS,
    maxTtlSeconds: CP_DEFAULTS.INBOUND_MAX_TTL_SECONDS,
  });
  if (!result.ok) {
    return deny(result.reason === "scope_insuffisant" ? 403 : 401, result.reason);
  }

  const supabase = createSupabaseAdminClient();
  const { claims } = result;

  // Anti-rejeu + traçabilité : chaque jti n'est accepté qu'une seule fois.
  const { error } = await supabase.from("control_plane_access_log").insert({
    jti: claims.jti,
    issuer: claims.iss,
    subject: claims.sub,
    scope: claims.scope,
    path: new URL(request.url).pathname,
    ip: clientIp(request),
    expires_at: new Date(claims.exp * 1000).toISOString(),
  });
  if (error) {
    if (error.code === "23505") return deny(401, "jeton_rejoue");
    console.error(`[control-plane] journal d'accès : ${error.message}`);
    return deny(503, "journalisation_indisponible");
  }

  return { ok: true, supabase, config, claims };
}
