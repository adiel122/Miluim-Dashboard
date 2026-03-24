"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShiftRow } from "@/lib/types/shabtzak";
import { SHIFT_TYPE_LABELS } from "@/lib/types/shabtzak";
import { formatDateDDMMYY, formatTimeRange } from "@/src/lib/date-format";
import { cn } from "@/lib/utils";

const NONE = "__none__";

type ShiftOption = Pick<
  ShiftRow,
  | "id"
  | "shift_date"
  | "shift_type"
  | "mission_name"
  | "start_time"
  | "end_time"
  | "team_count"
  | "is_published"
>;

type ShiftSearchSelectProps = {
  shifts: ShiftOption[];
  value: string;
  onValueChange: (shiftId: string) => void;
  noneValue?: string;
  className?: string;
};

function shiftLine(s: ShiftOption) {
  const teams =
    typeof s.team_count === "number" && s.team_count > 0
      ? ` · ${s.team_count} צוותים`
      : "";
  const draft = s.is_published === false ? " · טיוטה" : "";
  const times = formatTimeRange(s.start_time, s.end_time);
  return `${formatDateDDMMYY(s.shift_date)} · ${times} · ${SHIFT_TYPE_LABELS[s.shift_type]} · ${s.mission_name}${teams}${draft}`;
}

/**
 * בחירת משמרת עם חיפוש. הפאנל מוצג מתחת לכפתור (absolute) עם גובה מפורש לרשימה —
 * כדי שלא יתקפל ל־0 כמו ב־flex-1 ללא גובה אב מוגדר.
 */
export function ShiftSearchSelect({
  shifts,
  value,
  onValueChange,
  noneValue = NONE,
  className,
}: ShiftSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = shifts.find((s) => s.id === value);
  const displayText =
    !value || value === noneValue
      ? "בחר משמרת"
      : selected
        ? shiftLine(selected)
        : `מזהה לא ידוע (${value.slice(0, 8)}…)`;

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return shifts;
    return shifts.filter((s) => shiftLine(s).includes(q));
  }, [shifts, query]);

  return (
    <div ref={wrapRef} className={cn("relative z-40 w-full min-w-0", className)}>
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-9 w-full min-w-0 justify-between gap-2 px-2 py-1.5 font-normal"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 flex-1 truncate text-right" dir="rtl">
          {displayText}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
      </Button>

      {open ? (
        <div
          className={cn(
            "absolute start-0 end-0 top-full z-50 mt-1 flex flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg",
            "min-h-[12rem] max-h-[min(22rem,58vh)]"
          )}
          dir="rtl"
        >
          <div className="shrink-0 border-b border-border bg-popover p-2">
            <Input
              placeholder="חיפוש תאריך, שעה, משימה…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 bg-background"
              dir="rtl"
              autoComplete="off"
              autoFocus
            />
          </div>
          <ul
            className="min-h-[9rem] max-h-[min(14rem,40vh)] shrink-0 overflow-y-auto overscroll-contain border-t border-border/60 bg-popover p-1"
            role="listbox"
          >
            {shifts.length === 0 ? (
              <li className="px-2 py-4 text-center text-sm leading-relaxed text-muted-foreground">
                אין משמרות מהיום ואילך במערכת. צרו משמרת בכרטיס &quot;יצירת משמרת&quot; למעלה (תאריך
                עתידי), ואז חזרו לכאן.
              </li>
            ) : (
              <>
                <li role="option" aria-selected={!value || value === noneValue}>
                  <button
                    type="button"
                    className="flex w-full rounded-sm px-2 py-2 text-right text-sm text-foreground hover:bg-accent"
                    onClick={() => {
                      onValueChange("");
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    — ביטול בחירה —
                  </button>
                </li>
                {filtered.length === 0 ? (
                  <li className="px-2 py-4 text-center text-sm text-muted-foreground">
                    אין תוצאות לחיפוש. נסו מילה אחרת או נקו את שורת החיפוש.
                  </li>
                ) : (
                  filtered.map((s) => (
                    <li key={s.id} role="option" aria-selected={value === s.id}>
                      <button
                        type="button"
                        className="flex w-full rounded-sm px-2 py-2 text-right text-sm leading-snug text-foreground hover:bg-accent"
                        onClick={() => {
                          onValueChange(s.id);
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        {shiftLine(s)}
                      </button>
                    </li>
                  ))
                )}
              </>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
