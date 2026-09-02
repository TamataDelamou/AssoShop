import { CONTRIBUTION_CONFIG } from "@/utils/constants";

export function formatCurrency(
  amount: number,
  currency: string = CONTRIBUTION_CONFIG.CURRENCY,
): string {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount)} ${currency}`;
}

export function formatDate(date: Date | null, fallback = "-"): string {
  if (!date) return fallback;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date | null, fallback = "-"): string {
  if (!date) return fallback;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 o";
  const units = ["o", "Ko", "Mo", "Go"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
