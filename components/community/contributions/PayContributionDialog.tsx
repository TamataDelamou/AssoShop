"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePayContribution } from "@/hooks/community/usePayContribution";
import {
  Contribution,
  ContributionMethod,
  Member,
} from "@/types/modules/community";
import {
  COMMON_LABELS,
  CONTRIBUTION_CONFIG,
  CONTRIBUTION_LABELS,
  CONTRIBUTION_MESSAGES,
  CONTRIBUTION_METHOD_OPTIONS,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  members: Member[];
  contribution?: Contribution | null;
  onSuccess?: () => void;
}

export function PayContributionDialog({
  open,
  onOpenChange,
  organizationId,
  members,
  contribution,
  onSuccess,
}: Props) {
  const [beneficiaryId, setBeneficiaryId] = useState(
    contribution?.member_id ?? "",
  );
  const [amount, setAmount] = useState(
    contribution
      ? String(contribution.amount)
      : String(CONTRIBUTION_CONFIG.DEFAULT_AMOUNT),
  );
  const [method, setMethod] = useState<ContributionMethod>(
    ContributionMethod.ONLINE,
  );
  const [inputError, setInputError] = useState<string | null>(null);
  const { payContribution, loading, error } = usePayContribution();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const parsedAmount = Number(amount);
    if (!beneficiaryId) {
      setInputError(CONTRIBUTION_MESSAGES.MEMBER_REQUIRED);
      return;
    }
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setInputError(CONTRIBUTION_MESSAGES.AMOUNT_REQUIRED);
      return;
    }

    try {
      await payContribution(organizationId, {
        contribution_id: contribution?.id,
        beneficiary_member_id: beneficiaryId,
        amount: parsedAmount,
        method,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{CONTRIBUTION_LABELS.PAY_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="beneficiary">
              {CONTRIBUTION_LABELS.BENEFICIARY_LABEL}
            </Label>
            <Select value={beneficiaryId} onValueChange={setBeneficiaryId}>
              <SelectTrigger id="beneficiary">
                <SelectValue
                  placeholder={CONTRIBUTION_LABELS.BENEFICIARY_PLACEHOLDER}
                />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.user?.name ?? m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">{CONTRIBUTION_LABELS.AMOUNT_LABEL}</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">{CONTRIBUTION_LABELS.METHOD_LABEL}</Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as ContributionMethod)}
            >
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRIBUTION_METHOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {method === ContributionMethod.CASH ? (
            <Alert>
              <AlertDescription>
                {CONTRIBUTION_LABELS.CASH_PENDING_NOTE}
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
              {loading ? COMMON_LABELS.LOADING : CONTRIBUTION_LABELS.PAY_BUTTON}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
