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
import { useValidateSocialCase } from "@/hooks/community/useValidateSocialCase";
import { SocialCase } from "@/types/modules/community";
import {
  COMMON_LABELS,
  SOCIAL_CASE_LABELS,
  SOCIAL_CASE_MESSAGES,
} from "@/utils/constants";
import { formatCurrency } from "@/utils/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  socialCase: SocialCase | null;
  onSuccess?: () => void;
}

export function ValidateSocialCaseDialog({
  open,
  onOpenChange,
  organizationId,
  socialCase,
  onSuccess,
}: Props) {
  const [committeeNote, setCommitteeNote] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const { validateSocialCase, loading, error } = useValidateSocialCase();

  const run = async (decision: "approve" | "reject") => {
    if (!socialCase) return;
    setInputError(null);

    if (!committeeNote.trim()) {
      setInputError(SOCIAL_CASE_MESSAGES.NOTE_REQUIRED);
      return;
    }

    try {
      await validateSocialCase(
        organizationId,
        socialCase.id,
        decision,
        committeeNote.trim(),
      );
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  return (
    <Dialog open={open && !!socialCase} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{SOCIAL_CASE_LABELS.VALIDATE_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>
        {socialCase ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SOCIAL_CASE_LABELS.TITLE_LABEL}
                </span>
                <span className="font-medium">{socialCase.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SOCIAL_CASE_LABELS.BENEFICIARY_LABEL}
                </span>
                <span className="font-medium">
                  {socialCase.beneficiary_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SOCIAL_CASE_LABELS.TARGET_LABEL}
                </span>
                <span className="font-medium">
                  {formatCurrency(socialCase.target_amount)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {socialCase.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="committee-note">
                {SOCIAL_CASE_LABELS.COMMITTEE_NOTE_LABEL}
              </Label>
              <textarea
                id="committee-note"
                value={committeeNote}
                onChange={(e) => setCommitteeNote(e.target.value)}
                placeholder={SOCIAL_CASE_LABELS.COMMITTEE_NOTE_PLACEHOLDER}
                rows={3}
                className="w-full rounded-md border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            {inputError ? (
              <Alert variant="destructive">
                <AlertDescription>{inputError}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => run("reject")}
                disabled={loading}
                className="text-destructive"
              >
                {SOCIAL_CASE_LABELS.REJECT_BUTTON}
              </Button>
              <Button
                type="button"
                onClick={() => run("approve")}
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading
                  ? COMMON_LABELS.LOADING
                  : SOCIAL_CASE_LABELS.VALIDATE_BUTTON}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
