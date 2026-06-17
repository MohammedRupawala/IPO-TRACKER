import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Mask a PAN number: ABCDE1234F → ABCXX1234X */
export function maskPAN(pan: string): string {
  if (!pan || pan.length !== 10) return pan;
  return pan.slice(0, 3) + "XX" + pan.slice(5, 9) + "X";
}

/** Format an ISO timestamp to a human-readable string */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd MMM yyyy, hh:mm a");
  } catch {
    return dateStr;
  }
}

/** Format a date-only string */
export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}
