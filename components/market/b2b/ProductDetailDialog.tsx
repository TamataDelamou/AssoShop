"use client";

import { useState } from "react";
import { Product, Reseller } from "@/types/modules/market";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/formatters";
import { MARKET_LABELS } from "@/utils/constants";
import { Building2, MapPin, Package, ShoppingCart, Star } from "lucide-react";

interface ProductDetailDialogProps {
  product: Product | null;
  reseller: Reseller | null;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export function ProductDetailDialog({
  product,
  reseller,
  onOpenChange,
  onAddToCart,
}: ProductDetailDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [prevProductId, setPrevProductId] = useState<string | null>(null);

  if (product && product.id !== prevProductId) {
    setPrevProductId(product.id);
    setQuantity(product.min_order_quantity);
  }

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {product && (
          <>
            <div className="flex h-40 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 via-background to-secondary/20 text-5xl font-bold text-primary/70">
              {product.name.charAt(0).toUpperCase()}
            </div>
            <DialogHeader>
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription>{product.description}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">
                  {MARKET_LABELS.WHOLESALE_PRICE}
                </p>
                <p className="font-bold">
                  {formatCurrency(product.wholesale_price, product.currency)}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">
                  {MARKET_LABELS.RETAIL_PRICE}
                </p>
                <p className="font-bold text-primary">
                  {formatCurrency(product.retail_price, product.currency)}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">
                  {MARKET_LABELS.MIN_ORDER}
                </p>
                <p className="font-bold">{product.min_order_quantity}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">
                  {MARKET_LABELS.STOCK}
                </p>
                <p className="font-bold">{product.stock}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {product.city}, {product.country}
              </p>
              {reseller && (
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {reseller.company_name}
                  </p>
                  <Badge
                    variant="outline"
                    className="border-white/10 bg-white/5"
                  >
                    <Star className="mr-1 h-3 w-3 fill-primary text-primary" />
                    {reseller.rating.toFixed(1)}
                  </Badge>
                </div>
              )}
              <p className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                {reseller?.sector ?? "-"}
              </p>
            </div>

            <div className="flex items-end gap-3 border-t border-white/10 pt-4">
              <div className="w-28">
                <Label className="mb-1 block text-xs text-muted-foreground">
                  {MARKET_LABELS.QUANTITY}
                </Label>
                <Input
                  type="number"
                  min={product.min_order_quantity}
                  max={product.stock}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Number(e.target.value)))
                  }
                />
              </div>
              <Button
                className="flex-1"
                onClick={() => onAddToCart(product, quantity)}
                disabled={quantity < product.min_order_quantity}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {MARKET_LABELS.ADD_TO_CART}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
