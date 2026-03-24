import { format } from "date-fns";

/** תאריך לתצוגה: DD.MM.YY */
export function formatDateDDMMYY(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d + (d.length <= 10 ? "T12:00:00" : "")) : d;
  return format(date, "dd.MM.yy");
}

/** שעה מ-SQL (HH:MM:SS או HH:MM) */
export function formatTimeDisplay(t: string): string {
  const parts = t.split(":");
  if (parts.length < 2) return t;
  return `${parts[0]}:${parts[1]}`;
}
