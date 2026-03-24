"use client";

import { he } from "date-fns/locale";
import { useCallback, useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/src/utils/supabase/client";
import { formatDateDDMMYY } from "@/src/lib/date-format";

import "react-day-picker/style.css";

function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ConstraintsTab() {
  const [selected, setSelected] = useState<Date[] | undefined>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSelected([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profile_constraints")
      .select("constraint_date")
      .eq("profile_id", user.id);

    if (error || !data) {
      setSelected([]);
    } else {
      setSelected(data.map((r) => parseYMD(r.constraint_date as string)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const onSelect = async (next: Date[] | undefined) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const prev = selected ?? [];
    const n = next ?? [];
    const prevKeys = new Set(prev.map(toYMD));
    const nextKeys = new Set(n.map(toYMD));

    for (const d of prev) {
      const key = toYMD(d);
      if (!nextKeys.has(key)) {
        await supabase
          .from("profile_constraints")
          .delete()
          .eq("profile_id", user.id)
          .eq("constraint_date", key);
      }
    }

    for (const d of n) {
      const key = toYMD(d);
      if (!prevKeys.has(key)) {
        await supabase.from("profile_constraints").insert({
          profile_id: user.id,
          constraint_date: key,
        });
      }
    }

    setSelected(n);
  };

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">טוען יומן…</p>;
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="text-right">
        <CardTitle>אילוצים</CardTitle>
        <CardDescription>
          סמן תאריכים שבהם אינך זמין לשיבוץ. לחיצה חוזרת מסירה את האילוץ.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <DayPicker
          mode="multiple"
          dir="rtl"
          locale={he}
          selected={selected}
          onSelect={(d) => void onSelect(d)}
          className="rounded-lg border border-border p-3 [--rdp-accent-color:var(--primary)] [--rdp-background-color:var(--muted)]"
        />
        {(selected?.length ?? 0) > 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            נבחרו {(selected ?? []).length} תאריכים · לדוגמה:{" "}
            {(selected ?? [])
              .slice(0, 3)
              .map((d) => formatDateDDMMYY(d))
              .join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
