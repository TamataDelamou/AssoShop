"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAiMinutes } from "@/hooks/community/useAiMinutes";
import { useSaveMinutes } from "@/hooks/community/useSaveMinutes";
import { Meeting } from "@/types/modules/community";
import {
  AI_LABELS,
  COMMON_LABELS,
  MEETING_LABELS,
  MEETING_MESSAGES,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  meeting: Meeting | null;
  onSuccess?: () => void;
}

export function MinutesDialog({
  open,
  onOpenChange,
  organizationId,
  meeting,
  onSuccess,
}: Props) {
  const [minutes, setMinutes] = useState(meeting?.minutes ?? "");
  const [aiDraft, setAiDraft] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const { generate, generating, error: aiError } = useAiMinutes();
  const { saveMinutes, loading, error } = useSaveMinutes();

  const handleAssist = async () => {
    setInputError(null);
    try {
      const draft = await generate(minutes);
      setMinutes(draft);
      setAiDraft(true);
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting) return;
    setInputError(null);

    if (!minutes.trim()) {
      setInputError(MEETING_MESSAGES.MINUTES_REQUIRED);
      return;
    }

    try {
      await saveMinutes(organizationId, meeting.id, minutes.trim());
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  return (
    <Dialog open={open && !!meeting} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{MEETING_LABELS.MINUTES_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>
        {meeting ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minutes">{MEETING_LABELS.MINUTES_LABEL}</Label>
              <textarea
                id="minutes"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder={MEETING_LABELS.MINUTES_PLACEHOLDER}
                rows={10}
                className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            {aiDraft ? (
              <Alert>
                <AlertDescription>{AI_LABELS.DRAFT_NOTICE}</AlertDescription>
              </Alert>
            ) : null}
            {inputError ? (
              <Alert variant="destructive">
                <AlertDescription>{inputError}</AlertDescription>
              </Alert>
            ) : null}
            {aiError ? (
              <Alert variant="destructive">
                <AlertDescription>{aiError}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleAssist}
                disabled={generating}
              >
                {generating
                  ? AI_LABELS.GENERATING
                  : AI_LABELS.ASSIST_BUTTON}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {COMMON_LABELS.CANCEL}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading
                    ? COMMON_LABELS.LOADING
                    : MEETING_LABELS.SAVE_MINUTES_BUTTON}
                </Button>
              </div>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
