"use client";

import { useState, useEffect, useCallback } from "react";
import { signaturesService } from "@/services/community/signatures";
import {
  CreateSignatureRequestPayload,
  SignatureRequest,
} from "@/types/modules/community";

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
  const [signatures, setSignatures] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const data = await signaturesService.getSignatures(organizationId);
    return data.map(parseSignature);
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) setSignatures(data);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    try {
      setSignatures(await load());
    } catch (err) {
      setError(err as Error);
    }
  }, [load]);

  const createSignature = useCallback(
    async (payload: CreateSignatureRequestPayload) => {
      setCreating(true);
      setError(null);
      try {
        await signaturesService.createSignature(organizationId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, refetch],
  );

  const signSignature = useCallback(
    async (signatureId: string, signatoryId: string) => {
      setBusyId(signatureId);
      setError(null);
      try {
        await signaturesService.signSignature(
          organizationId,
          signatureId,
          signatoryId,
        );
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refetch],
  );

  const rejectSignature = useCallback(
    async (signatureId: string) => {
      setBusyId(signatureId);
      setError(null);
      try {
        await signaturesService.rejectSignature(organizationId, signatureId);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refetch],
  );

  return {
    signatures,
    loading,
    creating,
    busyId,
    error,
    createSignature,
    signSignature,
    rejectSignature,
  };
}
