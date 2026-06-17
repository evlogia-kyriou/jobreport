import { type ClassValue, clsx } from "clsx";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "EEEE, dd MMMM yyyy", { locale: id });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy, HH.mm", { locale: id }) + " WIB";
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), "HH.mm", { locale: id }) + " WIB";
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} menit`;
  if (mins === 0) return `${hours} jam`;
  return `${hours} jam ${mins} menit`;
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: id,
  });
}
