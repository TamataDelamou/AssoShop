"use client";

import { useCallback, useEffect, useState } from "react";
import { CartItem, Product } from "@/types/modules/market";

const CART_KEY = "assoshop:cart";

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Stockage indisponible : ignoré silencieusement.
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = readCart();
      if (!cancelled) {
        setItems(stored);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const addToCart = useCallback(
    (product: Product, resellerName: string, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.product_id === product.id);
        const next = existing
          ? prev.map((i) =>
              i.product_id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i,
            )
          : [
              ...prev,
              {
                product_id: product.id,
                product_name: product.name,
                quantity,
                unit_price: product.retail_price,
                currency: product.currency,
                reseller_name: resellerName,
              },
            ];
        writeCart(next);
        return next;
      });
    },
    [],
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      const next =
        quantity <= 0
          ? prev.filter((i) => i.product_id !== productId)
          : prev.map((i) =>
              i.product_id === productId ? { ...i, quantity } : i,
            );
      writeCart(next);
      return next;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.product_id !== productId);
      writeCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    writeCart([]);
  }, []);

  const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    items,
    count,
    total,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
}
