import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === "object" && err !== null) {
    const maybe = err as { response?: { data?: { message?: string } } };
    if (maybe.response?.data?.message) {
      return maybe.response.data.message;
    }
  }
  return fallback;
}
