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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useValidateAccountingEntry } from "@/hooks/accounting/useValidateAccountingEntry";
import { AccountingEntry } from "@/types/modules/accounting";
import { formatCurrency } from "@/utils/formatters";
import {
  ACCOUNTING_LABELS,
  ACCOUNTING_MESSAGES,
  COMMON_LABELS,
  TREASURY_ACCOUNT_OPTIONS,
} from "@/utils/constants";
import { TreasuryAccountBadge } from "./TreasuryAccountBadge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  entry: AccountingEntry | null;
  onSuccess?: () => void;
}

export function ValidateEntryDialog({
  open,
  onOpenChange,
  organizationId,
  entry,
  onSuccess,
}: Props) {
  const [validatorName, setValidatorName] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const { validateEntry, loading, error } = useValidateAccountingEntry();

  const needsSecond =
    !!entry?.requires_double_validation && !!entry?.validated_by;

  const handleDecision = async (decision: "approve" | "reject") => {
    if (!entry) return;
    if (!validatorName.trim()) {
      setInputError(ACCOUNTING_MESSAGES.VALIDATOR_REQUIRED);
      return;
    }
    setInputError(null);
    try {
      const result = await validateEntry(organizationId, entry.id, {
        decision,
        validator_name: validatorName.trim(),
      });
      if (result === null) {
        setQueued(true);
        onSuccess?.();
      } else {
        onSuccess?.();
        onOpenChange(false);
      }
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  return (
    <Dialog open={open && !!entry} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ACCOUNTING_LABELS.VALIDATE_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        {entry ? (
          queued ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  {ACCOUNTING_LABELS.ACTION_SYNC_PENDING}
                </AlertDescription>
              </Alert>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {COMMON_LABELS.CLOSE}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1 rounded-lg border border-border/50 p-3 text-sm">
                <p className="font-medium text-foreground">{entry.label}</p>
                <p className="text-muted-foreground">
                  {
                    TREASURY_ACCOUNT_OPTIONS.find(
                      (o) => o.value === entry.account_type,
                    )?.label
                  }{" "}
                  — {formatCurrency(entry.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ACCOUNTING_LABELS.PAYER_LABEL} : {entry.payer_name} ·{" "}
                  {ACCOUNTING_LABELS.BENEFICIARY_LABEL} :{" "}
                  {entry.beneficiary_name}
                </p>
                <div className="pt-1">
                  <TreasuryAccountBadge type={entry.account_type} />
                </div>
              </div>

              {entry.requires_double_validation ? (
                needsSecond ? (
                  <Alert>
                    <AlertDescription>
                      {ACCOUNTING_LABELS.SECOND_VALIDATION_NOTE}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertDescription>
                      {ACCOUNTING_LABELS.DOUBLE_VALIDATION_NOTE}
                    </AlertDescription>
                  </Alert>
                )
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="validator">
                  {ACCOUNTING_LABELS.VALIDATOR_LABEL}
                </Label>
                <Input
                  id="validator"
                  value={validatorName}
                  onChange={(e) => setValidatorName(e.target.value)}
                  placeholder={ACCOUNTING_LABELS.VALIDATOR_PLACEHOLDER}
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
                  disabled={loading}
                  onClick={() => handleDecision("reject")}
                >
                  {ACCOUNTING_LABELS.REJECT_BUTTON}
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDecision("approve")}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? COMMON_LABELS.LOADING : ACCOUNTING_LABELS.VALIDATE_BUTTON}
                </Button>
              </div>
            </div>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
