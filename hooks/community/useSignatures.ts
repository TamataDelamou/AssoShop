"use client";

import { useCallback, useState } from "react";
import { signaturesService } from "@/services/community/signatures";
import {
  CreateSignatureRequestPayload,
  SignatureRequest,
} from "@/types/modules/community";
import { SIGNATURE_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "signatures",
  cacheableReads: [SIGNATURE_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseSignature(s: SignatureRequest): SignatureRequest {
  return {
    ...s,
    created_at: s.created_at ? new Date(s.created_at) : null,
    signatories: s.signatories.map((signatory) => ({
      ...signatory,
      signed_at: signatory.signed_at ? new Date(signatory.signed_at) : null,
    })),
  };
}

export function useSignatures(organizationId: string) {
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } = useOfflineQuery<
    SignatureRequest[]
  >(
    `${SIGNATURE_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
    () => signaturesService.getSignatures(organizationId),
    {
      ttlMs: SIGNATURE_CONFIG.CACHE_TTL_MS,
      parse: (list) => list.map(parseSignature),
    },
  );

  const error = actionError ?? loadError;

  const createSignature = useCallback(
    async (payload: CreateSignatureRequestPayload) => {
      setCreating(true);
      setActionError(null);
      try {
        await signaturesService.createSignature(organizationId, payload);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refresh],
  );

  const signSignature = useCallback(
    async (signatureId: string, signatoryId: string) => {
      setBusyId(signatureId);
      setActionError(null);
      try {
        await signaturesService.signSignature(
          organizationId,
          signatureId,
          signatoryId,
        );
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refresh],
  );

  const rejectSignature = useCallback(
    async (signatureId: string) => {
      setBusyId(signatureId);
      setActionError(null);
      try {
        await signaturesService.rejectSignature(organizationId, signatureId);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refresh],
  );

  return {
    signatures: data ?? [],
    loading,
    creating,
    busyId,
    error,
    createSignature,
    signSignature,
    rejectSignature,
  };
}
