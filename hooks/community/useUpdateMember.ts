"use client";

import { useState } from "react";
import { base44Client } from "@/lib/base44";
import { MemberStatus, MemberRole } from "@/types/modules/community";
import { MEMBER_LABELS } from "@/utils/constants";
import { getErrorMessage } from "@/lib/utils";

interface UpdateMemberPayload {
  status?: MemberStatus;
  role?: MemberRole;
}

export function useUpdateMember() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMember = async (
    organizationId: string,
    memberId: string,
    payload: UpdateMemberPayload,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44Client.patch(
        `/organizations/${organizationId}/members/${memberId}`,
        payload,
      );
      return response.data;
    } catch (err: unknown) {
      const message = getErrorMessage(err, MEMBER_LABELS.ERROR_UPDATE);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { updateMember, loading, error };
}
