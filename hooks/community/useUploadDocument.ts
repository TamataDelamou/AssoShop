"use client";

import { useState } from "react";
import { documentsService } from "@/services/community/documents";
import {
  AssociationDocument,
  UploadDocumentPayload,
} from "@/types/modules/community";
import { DOCUMENT_CONFIG, DOCUMENT_LABELS } from "@/utils/constants";
import {
  enqueueSync,
  readCache,
  useNetworkStatus,
  writeCache,
} from "@/lib/offline";

type ApiError = { response?: { data?: { message?: string } } };

export function useUploadDocument() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const online = useNetworkStatus();

  const upload = async (
    organizationId: string,
    payload: UploadDocumentPayload,
  ): Promise<AssociationDocument | null> => {
    setLoading(true);
    setError(null);
    setPendingSync(false);
    try {
      if (!online) {
        const cacheKey = `${DOCUMENT_CONFIG.CACHE_KEY_PREFIX}${organizationId}`;
        enqueueSync({
          module: DOCUMENT_CONFIG.SYNC_MODULE,
          action: "upload",
          payload: { organizationId, ...payload },
        });

        const cached = readCache<AssociationDocument[]>(cacheKey) ?? [];
        const optimistic: AssociationDocument = {
          id: `local-${Date.now()}`,
          organization_id: organizationId,
          name: payload.name,
          description: payload.description || null,
          category: payload.category,
          file_name: payload.file_name,
          file_type: payload.file_type,
          file_size: payload.file_size,
          uploaded_by: DOCUMENT_CONFIG.DEFAULT_UPLOADER,
          created_at: new Date(),
        };
        writeCache(
          cacheKey,
          [optimistic, ...cached],
          DOCUMENT_CONFIG.CACHE_TTL_MS,
        );
        setPendingSync(true);
        return null;
      }

      return await documentsService.uploadDocument(organizationId, payload);
    } catch (err: unknown) {
      const message =
        (err as ApiError).response?.data?.message ||
        DOCUMENT_LABELS.UPLOAD_ERROR;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { upload, loading, error, pendingSync };
}
