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
import { useValidateContribution } from "@/hooks/community/useValidateContribution";
import { Contribution } from "@/types/modules/community";
import {
  COMMON_LABELS,
  CONTRIBUTION_CONFIG,
  CONTRIBUTION_LABELS,
  CONTRIBUTION_MESSAGES,
} from "@/utils/constants";
import { formatCurrency } from "@/utils/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  contribution: Contribution | null;
  onSuccess?: () => void;
}

export function ValidateCashPaymentDialog({
  open,
  onOpenChange,
  organizationId,
  contribution,
  onSuccess,
}: Props) {
  const [validatorName, setValidatorName] = useState("");
  const [secondConfirmation, setSecondConfirmation] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const { validateContribution, loading, error } = useValidateContribution();

  const requiresDoubleValidation =
    !!contribution &&
    contribution.amount > CONTRIBUTION_CONFIG.DOUBLE_VALIDATION_THRESHOLD;

  const run = async (decision: "approve" | "reject") => {
    if (!contribution) return;
    setInputError(null);

    if (!validatorName.trim()) {
      setInputError(CONTRIBUTION_MESSAGES.VALIDATOR_REQUIRED);
      return;
    }
    if (
      decision === "approve" &&
      requiresDoubleValidation &&
      !secondConfirmation
    ) {
      setInputError(CONTRIBUTION_MESSAGES.SECOND_VALIDATION_REQUIRED);
      return;
    }

    try {
      await validateContribution(
        organizationId,
        contribution.id,
        decision,
        validatorName.trim(),
      );
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  return (
    <Dialog open={open && !!contribution} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{CONTRIBUTION_LABELS.VALIDATE_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>
        {contribution ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {CONTRIBUTION_LABELS.MEMBER_LABEL}
                </span>
                <span className="font-medium">
                  {contribution.member?.name ?? "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {CONTRIBUTION_LABELS.AMOUNT_LABEL}
                </span>
                <span className="font-medium">
                  {formatCurrency(contribution.amount)}
                </span>
              </div>
            </div>

            {requiresDoubleValidation ? (
              <Alert>
                <AlertDescription>
                  {CONTRIBUTION_LABELS.DOUBLE_VALIDATION_NOTE}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="validator">
                {CONTRIBUTION_LABELS.VALIDATOR_LABEL}
              </Label>
              <Input
                id="validator"
                value={validatorName}
                onChange={(e) => setValidatorName(e.target.value)}
                placeholder={CONTRIBUTION_LABELS.VALIDATOR_PLACEHOLDER}
              />
            </div>

            {requiresDoubleValidation ? (
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={secondConfirmation}
                  onChange={(e) => setSecondConfirmation(e.target.checked)}
                  className="mt-0.5"
                />
                {CONTRIBUTION_LABELS.DOUBLE_VALIDATION_CONFIRM}
              </label>
            ) : null}

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
                {CONTRIBUTION_LABELS.REJECT_BUTTON}
              </Button>
              <Button
                type="button"
                onClick={() => run("approve")}
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading
                  ? COMMON_LABELS.LOADING
                  : CONTRIBUTION_LABELS.VALIDATE_BUTTON}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
