import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRON(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function conditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    NEW: "Nou",
    LIKE_NEW: "Ca nou",
    GOOD: "Bun",
    FAIR: "Satisfăcător",
  }
  return labels[condition] || condition
}
