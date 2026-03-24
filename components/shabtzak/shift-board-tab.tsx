"use client";

import { useCallback, useEffect, useState } from "react";

import { DateFieldCalendar } from "@/components/ui/date-field-calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShiftBoardShiftCards, type ShiftBoardShiftNested } from "@/components/shabtzak/shift-board-cards";
import type { ProfileRow } from "@/lib/types/shabtzak";
import { formatDateDDMMYY } from "@/src/lib/date-format";
import { createClient } from "@/src/utils/supabase/client";

import { SoldierContactDialog } from "./soldier-contact-dialog";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export function ShiftBoardTab() {
  const [selectedDate, setSelectedDate] = useState(todayYmd);
  const [shifts, setShifts] = useState<ShiftBoardShiftNested[]>([]);
  const [constraintMap, setConstraintMap] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<ProfileRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: shiftRows, error } = await supabase
      .from("shifts")
      .select(
        `
        id,
        shift_date,
        shift_type,
        mission_name,
        start_time,
        end_time,
        team_count,
        positions,
        assignments (
          id,
          shift_id,
          profile_id,
          team_number,
          position,
          profiles (
            id,
            first_name,
            last_name,
            military_id,
            phone,
            rank,
            role_description,
            is_admin
          )
        )
      `
      )
      .eq("shift_date", selectedDate)
      .eq("is_published", true)
      .order("start_time", { ascending: true });

    if (error || !shiftRows) {
      setShifts([]);
      setLoading(false);
      return;
    }

    const nested = shiftRows as unknown as ShiftBoardShiftNested[];
    setShifts(nested);

    if (nested.length === 0) {
      setConstraintMap({});
      setLoading(false);
      return;
    }

    const { data: cons } = await supabase
      .from("profile_constraints")
      .select("profile_id, constraint_date")
      .eq("constraint_date", selectedDate);

    const map: Record<string, Set<string>> = {};
    for (const row of cons ?? []) {
      const d = row.constraint_date as string;
      if (!map[d]) map[d] = new Set();
      map[d].add(row.profile_id as string);
    }
    setConstraintMap(map);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const openContact = (p: ProfileRow | null) => {
    if (!p) return;
    setContact(p);
    setDialogOpen(true);
  };

  const isToday = selectedDate === todayYmd();

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-wrap items-start gap-3 border-b border-border/60 pb-4">
        <div className="grid min-w-0 flex-1 gap-2 sm:min-w-[14rem] sm:flex-initial sm:max-w-md">
          <Label>תאריך בשבצ״ק</Label>
          <DateFieldCalendar
            idPrefix="board"
            className="w-full"
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={isToday}
          onClick={() => setSelectedDate(todayYmd())}
        >
          היום
        </Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">טוען משמרות…</p>
      ) : shifts.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          אין משמרות מפורסמות לתאריך {formatDateDDMMYY(selectedDate)}.
        </p>
      ) : (
        <section className="w-full min-w-0 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            שבצ״ק ל־{formatDateDDMMYY(selectedDate)}
          </h2>
          <ShiftBoardShiftCards
            shifts={shifts}
            constraintMap={constraintMap}
            onOpenContact={openContact}
          />
        </section>
      )}

      <SoldierContactDialog
        profile={contact}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
