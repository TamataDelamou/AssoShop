"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoanStatusBadge } from "./LoanStatusBadge";
import { useConfirmSponsor } from "@/hooks/finance/useConfirmSponsor";
import { useDecideLoan } from "@/hooks/finance/useDecideLoan";
import { useRepayInstallment } from "@/hooks/finance/useRepayInstallment";
import {
  GroupLoan,
  InstallmentStatus,
  LoanStatus,
} from "@/types/modules/finance";
import {
  COMMON_LABELS,
  INSTALLMENT_STATUS_OPTIONS,
  LOAN_LABELS,
} from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  loan: GroupLoan | null;
  onChanged?: () => void;
  onLoanChange?: (loan: GroupLoan) => void;
}

export function LoanDetailsDialog({
  open,
  onOpenChange,
  organizationId,
  loan,
  onChanged,
  onLoanChange,
}: Props) {
  const [repayingId, setRepayingId] = useState<string | null>(null);
  const {
    confirmSponsor,
    loading: confirming,
    error: confirmError,
    pendingSync: confirmPending,
  } = useConfirmSponsor();
  const {
    decideLoan,
    loading: deciding,
    error: decideError,
    pendingSync: decidePending,
  } = useDecideLoan();
  const {
    repayInstallment,
    loading: repaying,
    error: repayError,
    pendingSync: repayPending,
  } = useRepayInstallment();

  const handleConfirm = async () => {
    if (!loan) return;
    try {
      const result = await confirmSponsor(organizationId, loan.id);
      if (result) {
        onLoanChange?.(result);
      }
      onChanged?.();
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  const handleDecide = async (approved: boolean) => {
    if (!loan) return;
    try {
      const result = await decideLoan(organizationId, loan.id, approved);
      if (result) {
        onLoanChange?.(result);
      }
      onChanged?.();
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  const handleRepay = async (installmentId: string) => {
    if (!loan) return;
    setRepayingId(installmentId);
    try {
      const result = await repayInstallment(
        organizationId,
        loan.id,
        installmentId,
      );
      if (result) {
        onLoanChange?.(result);
      }
      onChanged?.();
    } catch {
      // L'erreur est déjà exposée par le hook.
    } finally {
      setRepayingId(null);
    }
  };

  return (
    <Dialog open={open && !!loan} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{LOAN_LABELS.PAGE_TITLE}</DialogTitle>
        </DialogHeader>
        {loan ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-foreground">
                  {loan.member_name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {loan.group_name} · {LOAN_LABELS.SPONSOR_LABEL} :{" "}
                  {loan.sponsor_name}
                </p>
              </div>
              <LoanStatusBadge status={loan.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">
                  {LOAN_LABELS.AMOUNT_LABEL}
                </p>
                <p className="font-medium">{formatCurrency(loan.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {LOAN_LABELS.INTEREST_LABEL}
                </p>
                <p className="font-medium">{loan.interest_rate}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {LOAN_LABELS.TOTAL_DUE_LABEL}
                </p>
                <p className="font-medium">
                  {loan.total_due > 0
                    ? formatCurrency(loan.total_due)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {LOAN_LABELS.REPAID_LABEL}
                </p>
                <p className="font-medium">
                  {formatCurrency(loan.repaid_amount)}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {LOAN_LABELS.SUGGESTED_LABEL} :{" "}
              {formatCurrency(loan.suggested_amount)} —{" "}
              {LOAN_LABELS.AI_SUGGEST_NOTE}
            </p>

            {loan.status === LoanStatus.REQUESTED ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={confirming}
                  onClick={handleConfirm}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {confirming
                    ? COMMON_LABELS.LOADING
                    : LOAN_LABELS.CONFIRM_SPONSOR_BUTTON}
                </Button>
              </div>
            ) : null}

            {loan.status === LoanStatus.SPONSOR_CONFIRMED ? (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deciding}
                  onClick={() => handleDecide(false)}
                >
                  {LOAN_LABELS.REJECT_BUTTON}
                </Button>
                <Button
                  type="button"
                  disabled={deciding}
                  onClick={() => handleDecide(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {deciding
                    ? COMMON_LABELS.LOADING
                    : LOAN_LABELS.APPROVE_BUTTON}
                </Button>
              </div>
            ) : null}

            {confirmPending || decidePending || repayPending ? (
              <Alert>
                <AlertDescription>
                  {LOAN_LABELS.ACTION_SYNC_PENDING}
                </AlertDescription>
              </Alert>
            ) : null}
            {confirmError || decideError || repayError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {confirmError ?? decideError ?? repayError}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {LOAN_LABELS.SCHEDULE_TITLE}
              </p>
              {!loan.installments?.length ? (
                <p className="text-sm text-muted-foreground">
                  {LOAN_LABELS.NO_INSTALLMENTS}
                </p>
              ) : (
                <ul className="space-y-2">
                  {loan.installments.map((i) => {
                    const statusOption = INSTALLMENT_STATUS_OPTIONS.find(
                      (s) => s.value === i.status,
                    );
                    return (
                      <li
                        key={i.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div>
                          <p className="text-foreground">
                            Échéance {i.position} ·{" "}
                            {formatCurrency(i.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(i.due_date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusOption ? (
                            <Badge
                              className={`${statusOption.color} border-none font-normal`}
                            >
                              {statusOption.label}
                            </Badge>
                          ) : null}
                          {i.status === InstallmentStatus.PENDING ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={repaying || repayingId === i.id}
                              onClick={() => handleRepay(i.id)}
                            >
                              {repayingId === i.id
                                ? COMMON_LABELS.LOADING
                                : LOAN_LABELS.REPAY_BUTTON}
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {COMMON_LABELS.CLOSE}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
