import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "N/A";
  const num = Number(amount);
  if (isNaN(num)) return "N/A";
  if (num >= 10000000) return "Rs " + (num / 10000000).toFixed(2) + " Cr";
  if (num >= 100000) return "Rs " + (num / 100000).toFixed(2) + " L";
  if (num >= 1000) return "Rs " + (num / 1000).toFixed(1) + "K";
  return "Rs " + num.toFixed(0);
}

export function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}