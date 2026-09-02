"use client";

import { useCallback, useState } from "react";
import { financialGroupsService } from "@/services/finance/financialGroups";
import { FinancialGroup } from "@/types/modules/finance";

export function useCloseGroup(organizationId: string) {
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const close = useCallback(
    async (groupId: string): Promise<FinancialGroup> => {
      setClosing(true);
      setError(null);
      try {
        return await financialGroupsService.closeGroup(
          organizationId,
          groupId,
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setClosing(false);
      }
    },
    [organizationId],
  );

  return { closing, error, close };
}
