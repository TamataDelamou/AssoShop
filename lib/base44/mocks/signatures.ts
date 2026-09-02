import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CreateSignatureRequestPayload,
  SignatureDocumentType,
  SignatureRequest,
  SignatureStatus,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type SignatureDTO = Omit<SignatureRequest, "created_at" | "signatories"> & {
  created_at: string | null;
  signatories: {
    id: string;
    name: string;
    role: string;
    signed_at: string | null;
  }[];
};

function at(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString();
}

const store: SignatureDTO[] = [
  {
    id: "sig-1",
    organization_id: "org-1",
    type: SignatureDocumentType.LOAN,
    title: "Prêt de trésorerie à la coopérative",
    description: "Avance remboursable pour financer la campagne de commercialisation.",
    amount: 5000000,
    requested_by: "Mamadou Bah",
    signatories: [
      {
        id: "sig-1-s1",
        name: "Aïssatou Diallo",
        role: "Présidente",
        signed_at: at(-1),
      },
      { id: "sig-1-s2", name: "Ousmane Camara", role: "Trésorier", signed_at: null },
    ],
    status: SignatureStatus.PENDING,
    created_at: at(-3),
  },
  {
    id: "sig-2",
    organization_id: "org-1",
    type: SignatureDocumentType.EXPENSE,
    title: "Achat de matériel agricole",
    description: "Acquisition d'outils pour les producteurs de Kindia.",
    amount: 2500000,
    requested_by: "Ousmane Camara",
    signatories: [
      {
        id: "sig-2-s1",
        name: "Aïssatou Diallo",
        role: "Présidente",
        signed_at: at(-6),
      },
      {
        id: "sig-2-s2",
        name: "Ousmane Camara",
        role: "Trésorier",
        signed_at: at(-5),
      },
    ],
    status: SignatureStatus.SIGNED,
    created_at: at(-8),
  },
  {
    id: "sig-3",
    organization_id: "org-1",
    type: SignatureDocumentType.MINUTES,
    title: "Procès-verbal de l'AG extraordinaire",
    description: "Adoption de la nouvelle convention collective interne.",
    requested_by: "Mariama Barry",
    signatories: [
      {
        id: "sig-3-s1",
        name: "Aïssatou Diallo",
        role: "Présidente",
        signed_at: at(-2),
      },
      {
        id: "sig-3-s2",
        name: "Mariama Barry",
        role: "Secrétaire générale",
        signed_at: at(-2),
      },
      { id: "sig-3-s3", name: "Ousmane Camara", role: "Trésorier", signed_at: null },
    ],
    status: SignatureStatus.PENDING,
    created_at: at(-4),
  },
  {
    id: "sig-4",
    organization_id: "org-1",
    type: SignatureDocumentType.EXCEPTIONAL_WITHDRAWAL,
    title: "Retrait exceptionnel pour urgence sociale",
    description: "Soutien d'urgence à un membre sinistré.",
    amount: 800000,
    requested_by: "Fatoumata Sow",
    signatories: [
      { id: "sig-4-s1", name: "Aïssatou Diallo", role: "Présidente", signed_at: null },
      { id: "sig-4-s2", name: "Ousmane Camara", role: "Trésorier", signed_at: null },
    ],
    status: SignatureStatus.PENDING,
    created_at: at(-1),
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/signatures$/;
const SIGN_URL = /^\/organizations\/([^/]+)\/signatures\/([^/]+)\/sign$/;
const REJECT_URL = /^\/organizations\/([^/]+)\/signatures\/([^/]+)\/reject$/;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toResponse(data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

function extractOrgId(url: string): string | null {
  const match = url.match(/^\/organizations\/([^/]+)\//);
  return match ? match[1] : null;
}

function listSignatures(config: InternalAxiosRequestConfig): SignatureDTO[] {
  const orgId = extractOrgId(config.url ?? "");
  return clone(
    store
      .filter((s) => s.organization_id === orgId)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
  );
}

function createSignature(config: InternalAxiosRequestConfig): SignatureDTO {
  const payload = (config.data ?? {}) as CreateSignatureRequestPayload;
  const orgId = extractOrgId(config.url ?? "") ?? "";

  const record: SignatureDTO = {
    id: `sig-${Date.now()}`,
    organization_id: orgId,
    type: payload.type,
    title: payload.title,
    description: payload.description,
    amount: payload.amount,
    requested_by: payload.requested_by,
    signatories: payload.signatories.map((s, i) => ({
      id: `sig-${Date.now()}-s${i}`,
      name: s.name,
      role: s.role,
      signed_at: null,
    })),
    status: SignatureStatus.PENDING,
    created_at: new Date().toISOString(),
  };
  store.push(record);
  return clone(record);
}

function signSignature(config: InternalAxiosRequestConfig): SignatureDTO {
  const match = SIGN_URL.exec(config.url ?? "");
  const [, , signatureId] = match ?? [];
  const payload = (config.data ?? {}) as { signatory_id?: string };

  const record = store.find((s) => s.id === signatureId);
  if (!record) throw new Error("Demande de signature introuvable");
  if (record.status !== SignatureStatus.PENDING) {
    throw new Error("Cette demande n'est plus en attente de signature");
  }

  const signatory = record.signatories.find(
    (s) => s.id === payload.signatory_id,
  );
  if (!signatory) throw new Error("Signataire introuvable");
  signatory.signed_at = new Date().toISOString();

  if (record.signatories.every((s) => s.signed_at !== null)) {
    record.status = SignatureStatus.SIGNED;
  }
  return clone(record);
}

function rejectSignature(config: InternalAxiosRequestConfig): SignatureDTO {
  const match = REJECT_URL.exec(config.url ?? "");
  const [, , signatureId] = match ?? [];

  const record = store.find((s) => s.id === signatureId);
  if (!record) throw new Error("Demande de signature introuvable");
  if (record.status !== SignatureStatus.PENDING) {
    throw new Error("Cette demande n'est plus en attente de signature");
  }
  record.status = SignatureStatus.REJECTED;
  return clone(record);
}

export function signaturesMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listSignatures(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createSignature(cfg));
  }
  if (method === "patch" && SIGN_URL.test(url)) {
    return async (cfg) => toResponse(signSignature(cfg));
  }
  if (method === "patch" && REJECT_URL.test(url)) {
    return async (cfg) => toResponse(rejectSignature(cfg));
  }

  return null;
}
