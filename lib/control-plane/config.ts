import type { JwtKey } from "@/lib/control-plane/jwt";

// ---------------------------------------------------------------------------
// Configuration du Control Plane GSG — SERVEUR UNIQUEMENT.
// Aucune variable n'est préfixée NEXT_PUBLIC_ : rien n'est exposé au navigateur.
// ---------------------------------------------------------------------------

/** Scopes attendus sur les jetons ENTRANTS (Kernel -> AssoShop). */
export const CP_INBOUND_SCOPES = {
  HEALTH_READ: "health:read",
  METRICS_READ: "metrics:read",
  AUDIT_READ: "audit:read",
  PUSH_TRIGGER: "control-plane:push",
} as const;

/** Scopes portés par les jetons SORTANTS (AssoShop -> Kernel). */
export const CP_OUTBOUND_SCOPES = {
  METRICS_WRITE: "metrics:write",
  AUDIT_WRITE: "audit:write",
} as const;

export const CP_DEFAULTS = {
  SERVICE_ID: "assoshop",
  KERNEL_ISSUER: "gsg-kernel",
  OUTBOUND_TTL_SECONDS: 120,
  INBOUND_MAX_TTL_SECONDS: 600,
  CLOCK_TOLERANCE_SECONDS: 30,
  BATCH_SIZE: 100,
  MAX_ATTEMPTS: 10,
  HTTP_TIMEOUT_MS: 10_000,
  AUDIT_PAGE_MAX: 500,
} as const;

/** Les clés PEM sont souvent stockées sur une ligne avec des « \n » littéraux. */
function normalizePem(value: string): string {
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

function readKey(secretVar: string, pemVar: string): JwtKey | null {
  const pem = process.env[pemVar];
  if (pem && pem.trim()) return { kind: "pem", pem: normalizePem(pem.trim()) };
  const secret = process.env[secretVar];
  if (secret && secret.length >= 32) return { kind: "secret", secret };
  return null;
}

function readList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export interface ControlPlaneConfig {
  enabled: boolean;
  serviceId: string;
  instanceId: string;
  kernelIssuer: string;
  metricsIngestUrl: string | null;
  auditIngestUrl: string | null;
  outboundKey: JwtKey | null;
  inboundKey: JwtKey | null;
  mtlsHeader: string | null;
  mtlsFingerprints: string[];
  cronSecret: string | null;
}

/** Lecture à l'appel (pas au chargement du module) pour rester testable. */
export function getControlPlaneConfig(): ControlPlaneConfig {
  const serviceId = process.env.CONTROL_PLANE_SERVICE_ID || CP_DEFAULTS.SERVICE_ID;
  return {
    enabled: process.env.CONTROL_PLANE_ENABLED === "1",
    serviceId,
    instanceId: process.env.CONTROL_PLANE_INSTANCE_ID || serviceId,
    kernelIssuer:
      process.env.CONTROL_PLANE_KERNEL_ISSUER || CP_DEFAULTS.KERNEL_ISSUER,
    metricsIngestUrl: process.env.CONTROL_PLANE_METRICS_URL || null,
    auditIngestUrl: process.env.CONTROL_PLANE_AUDIT_URL || null,
    outboundKey: readKey(
      "CONTROL_PLANE_OUTBOUND_SECRET",
      "CONTROL_PLANE_OUTBOUND_PRIVATE_KEY",
    ),
    inboundKey: readKey(
      "CONTROL_PLANE_INBOUND_SECRET",
      "CONTROL_PLANE_INBOUND_PUBLIC_KEY",
    ),
    mtlsHeader: process.env.CONTROL_PLANE_MTLS_HEADER?.toLowerCase() || null,
    mtlsFingerprints: readList("CONTROL_PLANE_MTLS_FINGERPRINTS"),
    cronSecret: process.env.CRON_SECRET || null,
  };
}
