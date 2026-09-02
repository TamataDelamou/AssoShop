"use client";

import { Product } from "@/types/modules/market";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { MARKET_LABELS } from "@/utils/constants";
import { Building2, MapPin, Package, ShoppingCart } from "lucide-react";

interface ProductCardProps {
  product: Product;
  resellerName: string;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({
  product,
  resellerName,
  onSelect,
  onAddToCart,
}: ProductCardProps) {
  return (
    <Card className="h-full">
      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 text-4xl font-bold text-primary/70">
        {product.name.charAt(0).toUpperCase()}
      </div>
      <CardHeader className="gap-1">
        <CardTitle className="line-clamp-2 text-sm leading-snug">
          {product.name}
        </CardTitle>
        <div className="text-lg font-bold text-foreground">
          {formatCurrency(product.retail_price, product.currency)}
        </div>
        <p className="text-xs text-muted-foreground">
          {MARKET_LABELS.WHOLESALE_PRICE} :{" "}
          {formatCurrency(product.wholesale_price, product.currency)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {MARKET_LABELS.MIN_ORDER} {product.min_order_quantity}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {product.city}, {product.country}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          {resellerName}
        </div>
        <Badge
          variant="outline"
          className="mt-auto w-fit border-white/10 bg-white/5"
        >
          {MARKET_LABELS.STOCK} : {product.stock}
        </Badge>
        <div className="mt-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(product)}
            className="flex-1 border-white/10"
          >
            {MARKET_LABELS.DETAILS}
          </Button>
          <Button
            size="sm"
            onClick={() => onAddToCart(product)}
            className="flex-1"
          >
            <ShoppingCart className="mr-1 h-3.5 w-3.5" />
            {MARKET_LABELS.ADD_SHORT}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
