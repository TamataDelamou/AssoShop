"use client";

import { useState } from "react";
import { aiAssistant, AtRiskMember } from "@/lib/ai";
import { GroupMember } from "@/types/modules/finance";
import { AI_LABELS } from "@/utils/constants";

export function useAiGroupRisk() {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (members: GroupMember[]): Promise<AtRiskMember[]> => {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await aiAssistant.detectAtRiskMembers(
        members.map((m) => ({
          id: m.id,
          name: m.name,
          engagement: m.engagement,
          lastPaymentAt: m.last_payment_at
            ? m.last_payment_at.toISOString()
            : null,
        })),
      );
      return result.flagged;
    } catch {
      setError(AI_LABELS.ERROR);
      throw new Error(AI_LABELS.ERROR);
    } finally {
      setAnalyzing(false);
    }
  };

  return { analyze, analyzing, error };
}
