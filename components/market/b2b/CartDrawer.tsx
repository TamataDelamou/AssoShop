"use client";

import { CartItem } from "@/types/modules/market";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { MARKET_LABELS } from "@/utils/constants";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  total: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}

export function CartDrawer({
  open,
  onOpenChange,
  items,
  total,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: CartDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            {MARKET_LABELS.CART_TITLE}
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {MARKET_LABELS.CART_EMPTY}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.reseller_name}
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {formatCurrency(item.unit_price * item.quantity, item.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-white/10"
                    onClick={() =>
                      onUpdateQuantity(item.product_id, item.quantity - 1)
                    }
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-white/10"
                    onClick={() =>
                      onUpdateQuantity(item.product_id, item.quantity + 1)
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onRemove(item.product_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-sm text-muted-foreground">
                {MARKET_LABELS.TOTAL}
              </span>
              <span className="text-lg font-bold">
                {formatCurrency(total, items[0].currency)}
              </span>
            </div>

            <Button className="w-full" onClick={onCheckout}>
              {MARKET_LABELS.CHECKOUT}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
