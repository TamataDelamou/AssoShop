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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateAccountingEntry } from "@/hooks/accounting/useCreateAccountingEntry";
import {
  AccountingEntryType,
  TreasuryAccountType,
} from "@/types/modules/accounting";
import {
  ACCOUNTING_CONFIG,
  ACCOUNTING_ENTRY_TYPE_OPTIONS,
  ACCOUNTING_LABELS,
  ACCOUNTING_MESSAGES,
  COMMON_LABELS,
  TREASURY_ACCOUNT_OPTIONS,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function CreateEntryDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: Props) {
  const [accountType, setAccountType] = useState<string>(
    TreasuryAccountType.CASH,
  );
  const [entryType, setEntryType] = useState<string>(
    AccountingEntryType.INCOME,
  );
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [justification, setJustification] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const { createEntry, loading, error } = useCreateAccountingEntry();

  const amountNumber = Number(amount);
  const isLargeExpense =
    entryType === AccountingEntryType.EXPENSE &&
    Number.isFinite(amountNumber) &&
    amountNumber > ACCOUNTING_CONFIG.DOUBLE_VALIDATION_THRESHOLD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountType) {
      setInputError(ACCOUNTING_MESSAGES.ACCOUNT_REQUIRED);
      return;
    }
    if (!entryType) {
      setInputError(ACCOUNTING_MESSAGES.TYPE_REQUIRED);
      return;
    }
    if (!label.trim()) {
      setInputError(ACCOUNTING_MESSAGES.LABEL_REQUIRED);
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setInputError(ACCOUNTING_MESSAGES.AMOUNT_REQUIRED);
      return;
    }
    if (!payer.trim()) {
      setInputError(ACCOUNTING_MESSAGES.PAYER_REQUIRED);
      return;
    }
    if (!beneficiary.trim()) {
      setInputError(ACCOUNTING_MESSAGES.BENEFICIARY_REQUIRED);
      return;
    }
    setInputError(null);
    try {
      const result = await createEntry(organizationId, {
        account_type: accountType as TreasuryAccountType,
        entry_type: entryType as AccountingEntryType,
        label: label.trim(),
        amount: amountNumber,
        payer_name: payer.trim(),
        beneficiary_name: beneficiary.trim(),
        justification: justification.trim() || null,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ACCOUNTING_LABELS.ENTRY_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        {queued ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {ACCOUNTING_LABELS.ENTRY_SYNC_PENDING}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account">
                  {ACCOUNTING_LABELS.ACCOUNT_LABEL}
                </Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger id="account">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TREASURY_ACCOUNT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-type">
                  {ACCOUNTING_LABELS.TYPE_LABEL}
                </Label>
                <Select value={entryType} onValueChange={setEntryType}>
                  <SelectTrigger id="entry-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNTING_ENTRY_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">{ACCOUNTING_LABELS.LABEL_LABEL}</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={ACCOUNTING_LABELS.LABEL_PLACEHOLDER}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{ACCOUNTING_LABELS.AMOUNT_LABEL}</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payer">{ACCOUNTING_LABELS.PAYER_LABEL}</Label>
                <Input
                  id="payer"
                  value={payer}
                  onChange={(e) => setPayer(e.target.value)}
                  placeholder={ACCOUNTING_LABELS.PAYER_PLACEHOLDER}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="beneficiary">
                  {ACCOUNTING_LABELS.BENEFICIARY_LABEL}
                </Label>
                <Input
                  id="beneficiary"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  placeholder={ACCOUNTING_LABELS.BENEFICIARY_PLACEHOLDER}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">
                {ACCOUNTING_LABELS.JUSTIFICATION_LABEL}
              </Label>
              <Input
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={ACCOUNTING_LABELS.JUSTIFICATION_PLACEHOLDER}
              />
            </div>

            {accountType === TreasuryAccountType.CASH ? (
              <Alert>
                <AlertDescription>
                  {ACCOUNTING_LABELS.CASH_PENDING_NOTE}
                </AlertDescription>
              </Alert>
            ) : null}
            {isLargeExpense ? (
              <Alert>
                <AlertDescription>
                  {ACCOUNTING_LABELS.DOUBLE_VALIDATION_NOTE}
                </AlertDescription>
              </Alert>
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
                onClick={() => onOpenChange(false)}
              >
                {COMMON_LABELS.CANCEL}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? COMMON_LABELS.LOADING : COMMON_LABELS.SAVE}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
