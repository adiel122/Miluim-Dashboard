"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  idPrefix: string;
  value: string;
  onChange: (ymd: string) => void;
  disabled?: boolean;
  className?: string;
};

function splitYmd(value: string): { y: string; m: string; d: string } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return { y, m, d };
  }
  return { y: "", m: "", d: "" };
}

function tryCommit(y: string, m: string, d: string): string | null {
  if (y.length !== 4) return null;
  const mm = m.padStart(2, "0").slice(0, 2);
  const dd = d.padStart(2, "0").slice(0, 2);
  if (mm.length !== 2 || dd.length !== 2) return null;
  const yi = Number(y);
  const mi = Number(mm);
  const di = Number(dd);
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return null;
  const dt = new Date(`${y}-${mm}-${dd}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== yi || dt.getMonth() + 1 !== mi || dt.getDate() !== di) return null;
  return `${y}-${mm}-${dd}`;
}

/** תאריך בשלושה שדות (שנה / חודש / יום) — נוח ב-RTL ללא date picker בעייתי */
export function YmdDateInputs({ idPrefix, value, onChange, disabled, className }: Props) {
  const [y, setY] = useState(() => splitYmd(value).y);
  const [m, setM] = useState(() => splitYmd(value).m);
  const [d, setD] = useState(() => splitYmd(value).d);

  useEffect(() => {
    const p = splitYmd(value);
    setY(p.y);
    setM(p.m);
    setD(p.d);
  }, [value]);

  const push = (ny: string, nm: string, nd: string) => {
    if (!ny && !nm && !nd) {
      onChange("");
      return;
    }
    const committed = tryCommit(ny, nm, nd);
    if (committed) onChange(committed);
  };

  return (
    <div
      dir="ltr"
      lang="en"
      className={cn("flex flex-wrap items-end gap-2 [direction:ltr]", className)}
    >
      <div className="grid min-w-[4.75rem] flex-1 gap-1">
        <Label htmlFor={`${idPrefix}-y`} className="text-xs text-muted-foreground">
          שנה
        </Label>
        <Input
          id={`${idPrefix}-y`}
          inputMode="numeric"
          placeholder="YYYY"
          className="text-center font-mono tabular-nums"
          value={y}
          onChange={(e) => {
            const ny = e.target.value.replace(/\D/g, "").slice(0, 4);
            setY(ny);
            push(ny, m, d);
          }}
          disabled={disabled}
        />
      </div>
      <span className="pb-2 text-muted-foreground select-none" aria-hidden>
        -
      </span>
      <div className="grid w-[4.25rem] min-w-[3.5rem] gap-1">
        <Label htmlFor={`${idPrefix}-m`} className="text-xs text-muted-foreground">
          חודש
        </Label>
        <Input
          id={`${idPrefix}-m`}
          inputMode="numeric"
          placeholder="MM"
          className="text-center font-mono tabular-nums"
          value={m}
          onChange={(e) => {
            const nm = e.target.value.replace(/\D/g, "").slice(0, 2);
            setM(nm);
            push(y, nm, d);
          }}
          disabled={disabled}
        />
      </div>
      <span className="pb-2 text-muted-foreground select-none" aria-hidden>
        -
      </span>
      <div className="grid w-[4.25rem] min-w-[3.5rem] gap-1">
        <Label htmlFor={`${idPrefix}-d`} className="text-xs text-muted-foreground">
          יום
        </Label>
        <Input
          id={`${idPrefix}-d`}
          inputMode="numeric"
          placeholder="DD"
          className="text-center font-mono tabular-nums"
          value={d}
          onChange={(e) => {
            const nd = e.target.value.replace(/\D/g, "").slice(0, 2);
            setD(nd);
            push(y, m, nd);
          }}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
