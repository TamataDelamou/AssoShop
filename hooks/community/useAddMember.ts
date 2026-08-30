"use client";

import { useState } from "react";
import { membersService } from "@/services/community/members";
import { CreateMemberPayload } from "@/types/modules/community";
import { MEMBER_LABELS } from "@/utils/constants";

type ApiError = { response?: { data?: { message?: string } } };

export function useAddMember() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMember = async (payload: CreateMemberPayload) => {
    setLoading(true);
    setError(null);
    try {
      return await membersService.addMember(payload.organization_id, payload);
    } catch (err: unknown) {
      const message = (err as ApiError).response?.data?.message || MEMBER_LABELS.ERROR_ADD;
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { addMember, loading, error };
}
