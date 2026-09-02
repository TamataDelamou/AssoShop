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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDeclarePayment } from "@/hooks/finance/useDeclarePayment";
import { FinancialGroup, GroupPaymentMethod } from "@/types/modules/finance";
import {
  COMMON_LABELS,
  FINANCE_LABELS,
  FINANCE_MESSAGES,
  GROUP_PAYMENT_METHOD_OPTIONS,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  group: FinancialGroup | null;
  onSuccess?: (result: FinancialGroup | null) => void;
}

const SELF = "self";

export function DeclarePaymentDialog({
  open,
  onOpenChange,
  organizationId,
  group,
  onSuccess,
}: Props) {
  const [memberId, setMemberId] = useState(
    () => group?.members?.[0]?.id ?? "",
  );
  const [beneficiaryId, setBeneficiaryId] = useState(SELF);
  const [amount, setAmount] = useState(() =>
    group ? String(group.amount) : "",
  );
  const [method, setMethod] = useState<GroupPaymentMethod>(
    GroupPaymentMethod.MOBILE,
  );
  const [inputError, setInputError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const { declarePayment, loading, error } = useDeclarePayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    setInputError(null);

    const amountValue = Number(amount);
    if (!amount.trim() || Number.isNaN(amountValue) || amountValue <= 0) {
      setInputError(FINANCE_MESSAGES.AMOUNT_REQUIRED);
      return;
    }

    try {
      const result = await declarePayment(organizationId, group.id, {
        member_id: memberId,
        amount: amountValue,
        paid_for_member_id:
          beneficiaryId === SELF ? null : beneficiaryId,
        method,
      });
      if (result === null) {
        setQueued(true);
        onSuccess?.(null);
      } else {
        onSuccess?.(result);
        onOpenChange(false);
      }
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  return (
    <Dialog open={open && !!group} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{FINANCE_LABELS.DECLARE_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>
        {group ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {group.name} · {FINANCE_LABELS.AMOUNT_LABEL}{" "}
              {group.amount}
            </p>

            {queued ? (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    {FINANCE_LABELS.SYNC_PENDING_PAYMENT}
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
                <div className="space-y-2">
                  <Label htmlFor="payer">{FINANCE_LABELS.PAYER_LABEL}</Label>
                  <Select value={memberId} onValueChange={setMemberId}>
                    <SelectTrigger id="payer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {group.members?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beneficiary">
                    {FINANCE_LABELS.BENEFICIARY_LABEL}
                  </Label>
                  <Select
                    value={beneficiaryId}
                    onValueChange={setBeneficiaryId}
                  >
                    <SelectTrigger id="beneficiary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELF}>
                        {FINANCE_LABELS.BENEFICIARY_PLACEHOLDER}
                      </SelectItem>
                      {group.members?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">{FINANCE_LABELS.AMOUNT_LABEL}</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">{FINANCE_LABELS.METHOD_LABEL}</Label>
                  <Select
                    value={method}
                    onValueChange={(value) =>
                      setMethod(value as GroupPaymentMethod)
                    }
                  >
                    <SelectTrigger id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_PAYMENT_METHOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {method === GroupPaymentMethod.CASH ? (
                    <p className="text-xs text-muted-foreground">
                      {FINANCE_LABELS.METHOD_NOTE_CASH}
                    </p>
                  ) : null}
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
                    onClick={() => onOpenChange(false)}
                  >
                    {COMMON_LABELS.CANCEL}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !memberId}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {loading
                      ? COMMON_LABELS.LOADING
                      : FINANCE_LABELS.DECLARE_PAYMENT_BUTTON}
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
