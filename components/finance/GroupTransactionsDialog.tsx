"use client";

import { useGroupTransactions } from "@/hooks/finance/useGroupTransactions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import { FINANCE_LABELS } from "@/utils/constants";
import {
  FinancialGroup,
  GroupTransactionKind,
} from "@/types/modules/finance";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, CircleDot } from "lucide-react";

const KIND_LABELS: Record<GroupTransactionKind, string> = {
  [GroupTransactionKind.CREATION]: "Ouverture",
  [GroupTransactionKind.PAYMENT]: "Versement",
  [GroupTransactionKind.PAYMENT_DECLARED]: "En attente",
  [GroupTransactionKind.TURN_PAYOUT]: "Tour versé",
};

const KIND_COLORS: Record<GroupTransactionKind, string> = {
  [GroupTransactionKind.CREATION]:
    "border-white/10 bg-white/5 text-muted-foreground",
  [GroupTransactionKind.PAYMENT]:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  [GroupTransactionKind.PAYMENT_DECLARED]:
    "border-amber-500/40 bg-amber-500/10 text-amber-400",
  [GroupTransactionKind.TURN_PAYOUT]:
    "border-sky-500/40 bg-sky-500/10 text-sky-400",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  group: FinancialGroup | null;
}

export function GroupTransactionsDialog({
  open,
  onOpenChange,
  organizationId,
  group,
}: Props) {
  const { transactions, loading, error } = useGroupTransactions(
    organizationId,
    group?.id ?? null,
  );

  return (
    <Dialog open={open && !!group} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            {FINANCE_LABELS.TRANSACTIONS_TITLE}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {group?.name}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full bg-muted/30" />
            <Skeleton className="h-12 w-full bg-muted/30" />
            <Skeleton className="h-12 w-full bg-muted/30" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {FINANCE_LABELS.TRANSACTIONS_EMPTY}
          </p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((t) => {
              const incoming = t.amount > 0;
              const outgoing = t.amount < 0;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/50 p-3 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {incoming ? (
                      <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : outgoing ? (
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-sky-500" />
                    ) : (
                      <CircleDot className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <p className="text-foreground truncate">{t.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.member_name ?? "—"}
                        {t.date ? ` · ${formatDateTime(t.date)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={cn(KIND_COLORS[t.kind], "border font-normal")}>
                      {KIND_LABELS[t.kind]}
                    </Badge>
                    {t.amount !== 0 && (
                      <p
                        className={cn(
                          "text-sm font-medium",
                          incoming ? "text-emerald-500" : "text-sky-500",
                        )}
                      >
                        {incoming ? "+" : "−"} {formatCurrency(Math.abs(t.amount))}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
