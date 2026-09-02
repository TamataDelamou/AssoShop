"use client";

import { useState } from "react";
import {
  CartItem,
  CreateOrderPayload,
  DeliveryMethod,
  Wallet,
} from "@/types/modules/market";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/utils/formatters";
import {
  DELIVERY_METHOD_OPTIONS,
  MARKET_LABELS,
  MARKET_MESSAGES,
} from "@/utils/constants";
import { WifiOff } from "lucide-react";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  total: number;
  wallet: Wallet | null;
  online: boolean;
  submitting: boolean;
  onSubmit: (payload: CreateOrderPayload) => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  items,
  total,
  wallet,
  online,
  submitting,
  onSubmit,
}: CheckoutDialogProps) {
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(
    DeliveryMethod.PICKUP,
  );
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currency = items[0]?.currency ?? "GNF";

  const handleSubmit = () => {
    setError(null);
    if (!deliveryCity.trim()) {
      setError(MARKET_MESSAGES.DELIVERY_CITY_REQUIRED);
      return;
    }
    if (deliveryMethod === DeliveryMethod.SCHEDULED && !deliveryDate) {
      setError(MARKET_MESSAGES.DELIVERY_DATE_REQUIRED);
      return;
    }
    onSubmit({
      items: items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
      })),
      delivery_method: deliveryMethod,
      delivery_date:
        deliveryMethod === DeliveryMethod.SCHEDULED ? deliveryDate : null,
      delivery_city: deliveryCity.trim(),
    });
  };

  const selectStyles =
    "h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{MARKET_LABELS.CHECKOUT}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {MARKET_LABELS.DELIVERY_METHOD}
            </Label>
            <select
              value={deliveryMethod}
              onChange={(e) =>
                setDeliveryMethod(e.target.value as DeliveryMethod)
              }
              className={selectStyles}
            >
              {DELIVERY_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {deliveryMethod === DeliveryMethod.SCHEDULED && (
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                {MARKET_LABELS.DELIVERY_DATE}
              </Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              {MARKET_LABELS.DELIVERY_CITY}
            </Label>
            <Input
              value={deliveryCity}
              onChange={(e) => setDeliveryCity(e.target.value)}
              placeholder="Conakry"
            />
          </div>

          <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {MARKET_LABELS.TOTAL}
              </span>
              <span className="font-bold">
                {formatCurrency(total, currency)}
              </span>
            </div>
            {wallet && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {MARKET_LABELS.WALLET_BALANCE}
                </span>
                <span className="font-bold text-primary">
                  {formatCurrency(wallet.balance, wallet.currency)}
                </span>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!online && (
            <p className="flex items-center gap-2 text-xs text-amber-400">
              <WifiOff className="h-3.5 w-3.5" />
              {MARKET_LABELS.OFFLINE_BADGE} — le paiement nécessite une
              connexion.
            </p>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || !online || items.length === 0}
          >
            {MARKET_LABELS.PAY}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
