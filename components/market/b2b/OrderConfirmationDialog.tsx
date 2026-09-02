"use client";

import { Order } from "@/types/modules/market";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { MARKET_LABELS } from "@/utils/constants";
import { CheckCircle2 } from "lucide-react";

interface OrderConfirmationDialogProps {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
}

export function OrderConfirmationDialog({
  order,
  onOpenChange,
}: OrderConfirmationDialogProps) {
  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        {order && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <DialogHeader>
              <DialogTitle>{MARKET_LABELS.ORDER_CONFIRMED}</DialogTitle>
              <DialogDescription>
                {MARKET_LABELS.ORDER_CONFIRMED_TEXT}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {MARKET_LABELS.ORDER_NUMBER}
                </span>
                <Badge variant="outline" className="border-white/10 bg-white/5">
                  {order.id}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {MARKET_LABELS.TOTAL}
                </span>
                <span className="font-bold">
                  {formatCurrency(order.total, order.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {MARKET_LABELS.DELIVERY_CITY}
                </span>
                <span>{order.delivery_city}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {MARKET_LABELS.ORDER_DATE}
                </span>
                <span>{formatDate(new Date(order.created_at))}</span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
