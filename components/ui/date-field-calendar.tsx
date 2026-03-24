"use client";

import { he } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";

import { YmdDateInputs } from "@/components/admin/ymd-date-inputs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateDDMMYY } from "@/src/lib/date-format";
import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

function parseYmd(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt;
}

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  idPrefix: string;
  value: string;
  onChange: (ymd: string) => void;
  disabled?: boolean;
  className?: string;
};

/** תאריך: יומן בחלון + אופציה להזנה ידנית (שנה/חודש/יום) */
export function DateFieldCalendar({ idPrefix, value, onChange, disabled, className }: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseYmd(value), [value]);
  const defaultMonth = selected ?? new Date();

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-3", className)} dir="rtl">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="min-w-0 text-sm text-muted-foreground">
          {value && selected ? (
            <span className="font-medium text-foreground">{formatDateDDMMYY(value)}</span>
          ) : (
            "לא נבחר תאריך"
          )}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <CalendarIcon className="size-4 opacity-80" aria-hidden />
          בחר בתאריך ביומן
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(100vw-1.5rem,22rem)] sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>בחירת תאריך</DialogTitle>
            <DialogDescription>לחיצה על יום ביומן קובעת את התאריך וסוגרת את החלון.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <DayPicker
              mode="single"
              dir="rtl"
              locale={he}
              selected={selected}
              defaultMonth={defaultMonth}
              onSelect={(d) => {
                if (d) {
                  onChange(toYmd(d));
                  setOpen(false);
                }
              }}
              className="rounded-lg border border-border p-3 [--rdp-accent-color:var(--primary)] [--rdp-background-color:var(--muted)]"
            />
          </div>
        </DialogContent>
      </Dialog>

      <details className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
        <summary className="cursor-pointer select-none font-medium text-muted-foreground">
          הזנה ידנית (שנה · חודש · יום)
        </summary>
        <div className="mt-3">
          <YmdDateInputs
            idPrefix={idPrefix}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        </div>
      </details>
    </div>
  );
}
