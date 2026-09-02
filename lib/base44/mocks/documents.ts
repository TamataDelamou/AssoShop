import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  AssociationDocument,
  DocumentCategory,
  UploadDocumentPayload,
} from "@/types/modules/community";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type DocumentDTO = Omit<AssociationDocument, "created_at"> & {
  created_at: string | null;
};

const store: DocumentDTO[] = [
  {
    id: "doc-1",
    organization_id: "org-1",
    name: "Statuts de l'association",
    description: "Statuts officiels déposés et approuvés en assemblée générale.",
    category: DocumentCategory.STATUTES,
    file_name: "statuts.pdf",
    file_type: "application/pdf",
    file_size: 245000,
    uploaded_by: "Bureau de l'association",
    created_at: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "doc-2",
    organization_id: "org-1",
    name: "Règlement intérieur",
    description: "Règles de fonctionnement interne de l'association.",
    category: DocumentCategory.INTERNAL_RULES,
    file_name: "reglement.pdf",
    file_type: "application/pdf",
    file_size: 180000,
    uploaded_by: "Bureau de l'association",
    created_at: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "doc-3",
    organization_id: "org-1",
    name: "PV — Assemblée générale 2025",
    description: "Procès-verbal de l'assemblée générale ordinaire.",
    category: DocumentCategory.MEETING_MINUTES,
    file_name: "pv_ag_2025.pdf",
    file_type: "application/pdf",
    file_size: 95000,
    uploaded_by: "Secrétariat",
    created_at: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "doc-4",
    organization_id: "org-1",
    name: "Rapport financier 2025",
    description: "Comptes annuels et rapport du trésorier.",
    category: DocumentCategory.FINANCIAL,
    file_name: "rapport_financier.pdf",
    file_type: "application/pdf",
    file_size: 320000,
    uploaded_by: "Trésorier",
    created_at: "2026-01-20T00:00:00.000Z",
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/documents$/;

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

function listDocuments(config: InternalAxiosRequestConfig): DocumentDTO[] {
  const params = (config.params ?? {}) as {
    search?: string;
    category?: string;
  };
  let result = store.slice();

  if (params.search) {
    const needle = params.search.toLowerCase();
    result = result.filter(
      (d) =>
        d.name.toLowerCase().includes(needle) ||
        (d.description ?? "").toLowerCase().includes(needle),
    );
  }

  if (params.category && params.category !== "all") {
    result = result.filter((d) => d.category === params.category);
  }

  return clone(result);
}

function createDocument(config: InternalAxiosRequestConfig): DocumentDTO {
  const payload = (config.data ?? {}) as UploadDocumentPayload;
  const record: DocumentDTO = {
    id: `doc-${Date.now()}`,
    organization_id: "org-1",
    name: payload.name,
    description: payload.description || null,
    category: payload.category,
    file_name: payload.file_name,
    file_type: payload.file_type,
    file_size: payload.file_size,
    uploaded_by: "Bureau de l'association",
    created_at: new Date().toISOString(),
  };
  store.unshift(record);
  return clone(record);
}

export function documentsMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listDocuments(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createDocument(cfg));
  }

  return null;
}
