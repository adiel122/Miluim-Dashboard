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
import { cn } from "@/lib/utils";
import type { ProfileRow } from "@/lib/types/shabtzak";

type ProfileSearchSelectProps = {
  value: string;
  onValueChange: (profileId: string) => void;
  profiles: ProfileRow[];
  noneValue: string;
  profileLabel: (p: ProfileRow) => string;
  hasConstraint: (id: string) => boolean;
  id?: string;
  className?: string;
};

type PanelPos = { top: number; left: number; width: number };

export function ProfileSearchSelect({
  value,
  onValueChange,
  profiles,
  noneValue,
  profileLabel,
  hasConstraint,
  id,
  className,
}: ProfileSearchSelectProps) {
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

  const selected = profiles.find((p) => p.id === value);
  const displayText =
    value === noneValue || !value
      ? "ללא"
      : selected
        ? hasConstraint(value)
          ? `${profileLabel(selected)} (אילוץ)`
          : profileLabel(selected)
        : `לא ברשימה (${value.slice(0, 8)}…)`;

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const label = profileLabel(p);
      const haystack = [
        label,
        p.military_id ?? "",
        p.phone ?? "",
        p.rank ?? "",
        p.role_description ?? "",
      ].join(" ");
      return haystack.includes(q);
    });
  }, [profiles, query, profileLabel]);

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
            placeholder="חיפוש: שם, מספר אישי, טלפון…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
            dir="rtl"
            autoComplete="off"
          />
        </div>
        <ul className="max-h-60 overflow-y-auto overscroll-contain p-1" role="listbox">
          <li role="option" aria-selected={value === noneValue || !value}>
            <button
              type="button"
              className="flex w-full rounded-sm px-2 py-2 text-right text-sm hover:bg-accent"
              onClick={() => {
                onValueChange(noneValue);
                setOpen(false);
                setQuery("");
              }}
            >
              ללא
            </button>
          </li>
          {filtered.map((p) => (
            <li key={p.id} role="option" aria-selected={value === p.id}>
              <button
                type="button"
                className="flex w-full flex-col gap-0.5 rounded-sm px-2 py-2 text-right text-sm hover:bg-accent"
                onClick={() => {
                  onValueChange(p.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span>
                  {profileLabel(p)}
                  {hasConstraint(p.id) ? (
                    <span className="text-destructive"> (אילוץ)</span>
                  ) : null}
                </span>
                {(p.military_id || p.rank) && (
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    {[p.rank, p.military_id].filter(Boolean).join(" · ")}
                  </span>
                )}
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
        id={id}
        className="h-auto min-h-9 w-full min-w-0 justify-between gap-2 px-2 py-1.5 font-normal"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((o) => !o);
        }}
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
