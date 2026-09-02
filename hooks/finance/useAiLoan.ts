"use client";

import { useState } from "react";
import { aiAssistant } from "@/lib/ai";
import { AI_LABELS } from "@/utils/constants";

interface SuggestInput {
  totalSaved: number;
  engagement: string;
  startDate: Date | null;
}

export function useAiLoan() {
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = async (input: SuggestInput): Promise<number> => {
    setSuggesting(true);
    setError(null);
    try {
      const monthsActive = input.startDate
        ? Math.max(
            1,
            Math.floor(
              (Date.now() - input.startDate.getTime()) /
                (30 * 24 * 60 * 60 * 1000),
            ),
          )
        : 1;
      const result = await aiAssistant.suggestLoanAmount({
        totalSaved: input.totalSaved,
        engagement: input.engagement,
        monthsActive,
      });
      return result.suggested;
    } catch {
      setError(AI_LABELS.ERROR);
      throw new Error(AI_LABELS.ERROR);
    } finally {
      setSuggesting(false);
    }
  };

  return { suggest, suggesting, error };
}
