"use client";

import { SubscriptionInvoice } from "@/types/modules/admin";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Receipt } from "lucide-react";

export function InvoicesView({ invoices }: { invoices: SubscriptionInvoice[] }) {
  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">{invoice.organization}</p>
              <p className="text-xs text-muted-foreground">
                {invoice.plan} · échéance le {formatDate(invoice.due_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                invoice.status === "payée"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-400"
              }
            >
              {invoice.status}
            </Badge>
            <p className="font-bold">{formatCurrency(invoice.amount, "GNF")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
