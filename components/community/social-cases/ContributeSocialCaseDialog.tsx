"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useContributeSocialCase } from "@/hooks/community/useContributeSocialCase";
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

export function ContributeSocialCaseDialog({
  open,
  onOpenChange,
  organizationId,
  socialCase,
  onSuccess,
}: Props) {
  const [contributorName, setContributorName] = useState("");
  const [amount, setAmount] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const { contribute, loading, error } = useContributeSocialCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialCase) return;
    setInputError(null);

    const parsedAmount = Number(amount);
    if (!contributorName.trim() && !anonymous) {
      setInputError(SOCIAL_CASE_MESSAGES.CONTRIBUTOR_REQUIRED);
      return;
    }
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setInputError(SOCIAL_CASE_MESSAGES.CONTRIBUTION_AMOUNT_REQUIRED);
      return;
    }

    try {
      await contribute(organizationId, socialCase.id, {
        contributor_name: contributorName.trim(),
        amount: parsedAmount,
        anonymous,
      });
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
          <DialogTitle>{SOCIAL_CASE_LABELS.CONTRIBUTE_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>
        {socialCase ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-border/50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SOCIAL_CASE_LABELS.TITLE_LABEL}
                </span>
                <span className="font-medium">{socialCase.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {SOCIAL_CASE_LABELS.TARGET_LABEL}
                </span>
                <span className="font-medium">
                  {formatCurrency(socialCase.target_amount)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contributor-name">
                {SOCIAL_CASE_LABELS.CONTRIBUTOR_NAME_LABEL}
              </Label>
              <Input
                id="contributor-name"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                placeholder={SOCIAL_CASE_LABELS.CONTRIBUTOR_NAME_PLACEHOLDER}
                disabled={anonymous}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{SOCIAL_CASE_LABELS.TARGET_LABEL}</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="mt-0.5"
              />
              {SOCIAL_CASE_LABELS.ANONYMOUS_LABEL}
            </label>

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
                  : SOCIAL_CASE_LABELS.CONTRIBUTE_BUTTON}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
