"use client";

import { useCallback, useState } from "react";
import { ordersService } from "@/services/market/orders";
import { CreateOrderPayload, Order } from "@/types/modules/market";

export function useCheckout() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkout = useCallback(
    async (payload: CreateOrderPayload): Promise<Order | null> => {
      setSubmitting(true);
      setError(null);
      try {
        const order = await ordersService.createOrder(payload);
        return await ordersService.payOrder(order.id);
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return { checkout, submitting, error };
}
