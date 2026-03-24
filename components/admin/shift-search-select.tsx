"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShiftRow } from "@/lib/types/shabtzak";
import { SHIFT_TYPE_LABELS } from "@/lib/types/shabtzak";
import { formatDateDDMMYY, formatTimeDisplay } from "@/src/lib/date-format";
import { cn } from "@/lib/utils";

const NONE = "__none__";

type ShiftOption = Pick<
  ShiftRow,
  "id" | "shift_date" | "shift_type" | "mission_name" | "start_time" | "team_count"
>;

type ShiftSearchSelectProps = {
  shifts: ShiftOption[];
  value: string;
  onValueChange: (shiftId: string) => void;
  noneValue?: string;
  className?: string;
};

type PanelPos = { top: number; left: number; width: number };

function shiftLine(s: ShiftOption) {
  const teams =
    typeof s.team_count === "number" && s.team_count > 0
      ? ` · ${s.team_count} צוותים`
      : "";
  return `${formatDateDDMMYY(s.shift_date)} · ${formatTimeDisplay(s.start_time)} · ${SHIFT_TYPE_LABELS[s.shift_type]} · ${s.mission_name}${teams}`;
}

export function ShiftSearchSelect({
  shifts,
  value,
  onValueChange,
  noneValue = NONE,
  className,
}: ShiftSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<PanelPos>({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    const onWin = () => updatePos();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
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

  const panel =
    open && typeof document !== "undefined" ? (
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: Math.max(pos.width, 220),
          zIndex: 200,
        }}
        className="flex max-h-80 flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        dir="rtl"
      >
        <div className="border-b border-border p-2">
          <Input
            placeholder="חיפוש תאריך, שעה, משימה…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
            dir="rtl"
            autoComplete="off"
          />
        </div>
        <ul className="max-h-60 overflow-y-auto overscroll-contain p-1" role="listbox">
          <li role="option" aria-selected={!value || value === noneValue}>
            <button
              type="button"
              className="flex w-full rounded-sm px-2 py-2 text-right text-sm hover:bg-accent"
              onClick={() => {
                onValueChange("");
                setOpen(false);
                setQuery("");
              }}
            >
              —
            </button>
          </li>
          {filtered.map((s) => (
            <li key={s.id} role="option" aria-selected={value === s.id}>
              <button
                type="button"
                className="flex w-full rounded-sm px-2 py-2 text-right text-sm leading-snug hover:bg-accent"
                onClick={() => {
                  onValueChange(s.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {shiftLine(s)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div ref={wrapRef} className={cn("relative w-full min-w-0", className)}>
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
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
