import { randomUUID } from "crypto";

// RG-P03 : commission de service (0,5 % par défaut).
export function serviceFee(amount: number, rate = 0.005): number {
  return Math.round(amount * rate);
}

// RG-P02 : identifiant de transaction unique.
export function generateReference(): string {
  const year = new Date().getFullYear();
  return `PAY-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;
}
