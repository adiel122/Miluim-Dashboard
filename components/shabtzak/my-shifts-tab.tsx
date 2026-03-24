"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssignmentRow, ShiftRow } from "@/lib/types/shabtzak";
import { SHIFT_TYPE_LABELS } from "@/lib/types/shabtzak";
import { formatDateDDMMYY, formatTimeRange } from "@/src/lib/date-format";
import { createClient } from "@/src/utils/supabase/client";

type AssignmentNested = AssignmentRow & {
  shifts: ShiftRow;
};

export function MyShiftsTab() {
  const [rows, setRows] = useState<AssignmentNested[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("assignments")
      .select(
        `
        id,
        shift_id,
        profile_id,
        team_number,
        position,
        shifts (
          id,
          shift_date,
          shift_type,
          mission_name,
          start_time,
          end_time
        )
      `
      )
      .eq("profile_id", user.id)
      .order("shift_id", { ascending: true });

    if (error || !data) {
      setRows([]);
      setLoading(false);
      return;
    }

    const filtered = (data as unknown as AssignmentNested[]).filter(
      (r) => r.shifts && r.shifts.shift_date >= today
    );
    filtered.sort((a, b) => {
      const da = a.shifts.shift_date.localeCompare(b.shifts.shift_date);
      if (da !== 0) return da;
      return a.shifts.start_time.localeCompare(b.shifts.start_time);
    });
    setRows(filtered);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">טוען…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        לא שובצת למשמרות קרובות.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => {
        const s = r.shifts;
        const day = s.shift_type === "day";
        return (
          <Card
            key={r.id}
            className={
              day
                ? "border-blue-200 bg-blue-50"
                : "border-orange-200 bg-orange-50"
            }
          >
            <CardHeader className="pb-2 text-right">
              <CardTitle className="text-base">{s.mission_name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatDateDDMMYY(s.shift_date)} · {formatTimeRange(s.start_time, s.end_time)} ·{" "}
                {SHIFT_TYPE_LABELS[s.shift_type]}
              </p>
            </CardHeader>
            <CardContent className="text-right text-sm text-muted-foreground">
              צוות {r.team_number} · {r.position}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
