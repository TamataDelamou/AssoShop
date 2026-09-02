"use client";

import { useState } from "react";
import { aiAssistant } from "@/lib/ai";
import { AI_LABELS } from "@/utils/constants";

export function useAiAnnouncement() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (prompt: string): Promise<string> => {
    setGenerating(true);
    setError(null);
    try {
      const result = await aiAssistant.draftAnnouncement(prompt);
      return result.draft;
    } catch {
      setError(AI_LABELS.ERROR);
      throw new Error(AI_LABELS.ERROR);
    } finally {
      setGenerating(false);
    }
  };

  return { generate, generating, error };
}
