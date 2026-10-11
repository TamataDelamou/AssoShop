"use client";

import { useState } from "react";
import { Order, OrderStatus } from "@/types/modules/market";
import { resellerService } from "@/services/market/reseller";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import { MARKET_LABELS, ORDER_STATUS_LABELS } from "@/utils/constants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { canAdvanceOrder } from "@/lib/market-orders";
import { PackageCheck, QrCode, Truck, UserCheck } from "lucide-react";

function StatusBadge({ status }: { status: OrderStatus }) {
  const variant =
    status === OrderStatus.DELIVERED
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      : status === OrderStatus.READY_FOR_PICKUP
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-white/10 bg-white/5 text-muted-foreground";
  return (
    <Badge variant="outline" className={variant}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

interface ResellerOrdersProps {
  orders: Order[];
  onChanged: () => void;
}

export function ResellerOrders({ orders, onChanged }: ResellerOrdersProps) {
  const [deliverTarget, setDeliverTarget] = useState<Order | null>(null);
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (order: Order) => {
    setBusy(true);
    setError(null);
    try {
      await resellerService.scanParcel(order.id);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Expédiée puis arrivée : étapes déclarées par le revendeur.
  const handleAdvance = async (order: Order, status: OrderStatus) => {
    setBusy(true);
    setError(null);
    try {
      await resellerService.advanceOrder(order.id, status);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeliver = async () => {
    if (!deliverTarget) return;
    setBusy(true);
    setError(null);
    try {
      await resellerService.deliverParcel(deliverTarget.id, recipient.trim());
      setDeliverTarget(null);
      setRecipient("");
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (orders.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
        {MARKET_LABELS.EMPTY_CATALOG}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">
              {MARKET_LABELS.ORDER_NUMBER} {order.id}
            </CardTitle>
            <StatusBadge status={order.status} />
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 text-sm">
              {order.items.map((item) => (
                <li
                  key={item.product_id}
                  className="flex items-center justify-between"
                >
                  <span className="text-muted-foreground">
                    {item.quantity} × {item.product_name}
                  </span>
                  <span>
                    {formatCurrency(item.unit_price * item.quantity, item.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-sm">
              <span className="text-muted-foreground">
                {order.delivery_city}
                {order.delivery_date ? ` · ${order.delivery_date}` : ""}
              </span>
              <span className="font-bold">
                {formatCurrency(order.total, order.currency)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(order.created_at)}
            </p>

            {canAdvanceOrder(order, OrderStatus.SHIPPED) && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleAdvance(order, OrderStatus.SHIPPED)}
                disabled={busy}
              >
                <Truck className="mr-1.5 h-4 w-4" />
                {MARKET_LABELS.MARK_SHIPPED}
              </Button>
            )}
            {canAdvanceOrder(order, OrderStatus.ARRIVED) && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleAdvance(order, OrderStatus.ARRIVED)}
                disabled={busy}
              >
                <PackageCheck className="mr-1.5 h-4 w-4" />
                {MARKET_LABELS.MARK_ARRIVED}
              </Button>
            )}
            {order.status === OrderStatus.ARRIVED && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleScan(order)}
                disabled={busy}
              >
                <QrCode className="mr-1.5 h-4 w-4" />
                {MARKET_LABELS.SIMULATE_SCAN}
              </Button>
            )}
            {order.status === OrderStatus.READY_FOR_PICKUP && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => setDeliverTarget(order)}
                disabled={busy}
              >
                <UserCheck className="mr-1.5 h-4 w-4" />
                {MARKET_LABELS.DELIVER}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog
        open={!!deliverTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeliverTarget(null);
            setRecipient("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{MARKET_LABELS.DELIVER}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.RECIPIENT}
              </Label>
              <Input
                value={recipient}
                placeholder="Nom du destinataire"
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleDeliver}
              disabled={busy || !recipient.trim()}
            >
              {MARKET_LABELS.DELIVER}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
