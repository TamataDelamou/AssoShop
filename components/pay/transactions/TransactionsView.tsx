"use client";

import { useState } from "react";
import { Transaction, TransactionType, Wallet } from "@/types/modules/pay";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import {
  PAY_LABELS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/utils/constants";
import { cn } from "@/lib/utils";
import { Receipt } from "lucide-react";

function typeVariant(type: TransactionType): string {
  switch (type) {
    case TransactionType.TOPUP:
    case TransactionType.RECEIPT:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    case TransactionType.WITHDRAWAL:
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    case TransactionType.TRANSFER:
      return "border-sky-500/40 bg-sky-500/10 text-sky-400";
    case TransactionType.PAYMENT:
      return "border-destructive/40 bg-destructive/10 text-destructive";
    default:
      return "border-white/10 bg-white/5 text-muted-foreground";
  }
}

function isIncoming(type: TransactionType): boolean {
  return type === TransactionType.TOPUP || type === TransactionType.RECEIPT;
}

export function TransactionsView({
  transactions,
  wallets,
}: {
  transactions: Transaction[];
  wallets: Wallet[];
}) {
  const [selected, setSelected] = useState<Transaction | null>(null);
  const walletLabel = (id: string) =>
    wallets.find((w) => w.id === id)?.label ?? "-";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-light">{PAY_LABELS.TRANSACTIONS_TITLE}</h3>
      </div>

      {transactions.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
          {PAY_LABELS.NO_TRANSACTIONS}
        </p>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const incoming = isIncoming(tx.type);
            return (
              <Card key={tx.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">
                    {tx.description}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={typeVariant(tx.type)}
                  >
                    {TRANSACTION_TYPE_LABELS[tx.type]}
                  </Badge>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">
                      {tx.counterparty} · {walletLabel(tx.wallet_id)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(tx.created_at)} ·{" "}
                      {TRANSACTION_STATUS_LABELS[tx.status]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "font-bold",
                        incoming ? "text-emerald-400" : "text-foreground",
                      )}
                    >
                      {incoming ? "+" : "−"}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-white/10"
                      onClick={() => setSelected(tx)}
                    >
                      <Receipt className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* PAY-08 : reçu numérique */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{PAY_LABELS.RECEIPT}</DialogTitle>
                <DialogDescription>
                  {TRANSACTION_TYPE_LABELS[selected.type]}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {PAY_LABELS.REFERENCE}
                  </span>
                  <span className="font-mono">{selected.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {PAY_LABELS.DATE}
                  </span>
                  <span>{formatDateTime(selected.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {PAY_LABELS.COUNTERPARTY}
                  </span>
                  <span>{selected.counterparty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {PAY_LABELS.AMOUNT}
                  </span>
                  <span className="font-bold">
                    {formatCurrency(selected.amount, selected.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {PAY_LABELS.SERVICE_FEE}
                  </span>
                  <span>
                    {formatCurrency(selected.commission, selected.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {PAY_LABELS.STATUS}
                  </span>
                  <span>{TRANSACTION_STATUS_LABELS[selected.status]}</span>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {PAY_LABELS.PAGE_TITLE} — reçu généré automatiquement.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
