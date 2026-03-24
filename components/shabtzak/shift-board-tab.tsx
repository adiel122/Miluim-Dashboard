"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AssignmentRow, ProfileRow, ShiftRow } from "@/lib/types/shabtzak";
import { DEFAULT_ROSTER_POSITIONS, SHIFT_TYPE_LABELS } from "@/lib/types/shabtzak";
import { formatDateDDMMYY, formatTimeDisplay } from "@/src/lib/date-format";
import { createClient } from "@/src/utils/supabase/client";

import { SoldierContactDialog } from "./soldier-contact-dialog";

type AssignmentNested = AssignmentRow & { profiles: ProfileRow | null };
type ShiftNested = ShiftRow & { assignments: AssignmentNested[] };

type RosterShape = {
  team_count: number;
  positions: string[];
};

function teamsForShift(shift: ShiftNested, teamCount: number): number[] {
  const s = new Set<number>();
  for (let t = 1; t <= teamCount; t++) s.add(t);
  for (const a of shift.assignments ?? []) s.add(a.team_number);
  return Array.from(s).sort((a, b) => a - b);
}

function positionsForShift(shift: ShiftNested, template: string[]): string[] {
  const fromAssign = new Set((shift.assignments ?? []).map((a) => a.position));
  const ordered: string[] = [...template];
  for (const p of Array.from(fromAssign)) {
    if (!ordered.includes(p)) ordered.push(p);
  }
  return ordered;
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export function ShiftBoardTab() {
  const [selectedDate, setSelectedDate] = useState(todayYmd);
  const [shifts, setShifts] = useState<ShiftNested[]>([]);
  const [constraintMap, setConstraintMap] = useState<Record<string, Set<string>>>({});
  const [roster, setRoster] = useState<RosterShape>({
    team_count: 3,
    positions: [...DEFAULT_ROSTER_POSITIONS],
  });
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<ProfileRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: settings } = await supabase
      .from("admin_roster_settings")
      .select("team_count, positions")
      .eq("id", 1)
      .maybeSingle();

    if (settings) {
      const pos =
        (settings.positions as string[])?.filter((p) => p.trim().length > 0) ?? [
          ...DEFAULT_ROSTER_POSITIONS,
        ];
      setRoster({
        team_count: Math.min(15, Math.max(1, Number(settings.team_count) || 3)),
        positions: pos.length > 0 ? pos : [...DEFAULT_ROSTER_POSITIONS],
      });
    }

    const { data: shiftRows, error } = await supabase
      .from("shifts")
      .select(
        `
        id,
        shift_date,
        shift_type,
        mission_name,
        start_time,
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
      .order("start_time", { ascending: true });

    if (error || !shiftRows) {
      setShifts([]);
      setLoading(false);
      return;
    }

    const nested = shiftRows as unknown as ShiftNested[];
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
      <div className="flex flex-wrap items-end gap-3 border-b border-border/60 pb-4">
        <div className="grid min-w-[10rem] flex-1 gap-2 sm:min-w-[12rem] sm:flex-initial">
          <Label htmlFor="board-date">תאריך בשבצ״ק</Label>
          <Input
            id="board-date"
            type="date"
            dir="ltr"
            className="w-full sm:w-auto"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
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
          אין משמרות לתאריך {formatDateDDMMYY(selectedDate)}.
        </p>
      ) : (
        <section className="w-full min-w-0 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            שבצ״ק ל־{formatDateDDMMYY(selectedDate)}
          </h2>
          <div className="flex w-full min-w-0 flex-col gap-6">
            {shifts.map((shift) => {
              const constrained = constraintMap[shift.shift_date] ?? new Set<string>();
              const teams = teamsForShift(shift, roster.team_count);
              const positions = positionsForShift(shift, roster.positions);
              return (
                <Card
                  key={shift.id}
                  className={cn(
                    "w-full min-w-0 overflow-hidden",
                    shift.shift_type === "day"
                      ? "border-blue-200/80 bg-blue-50/80"
                      : "border-orange-200/80 bg-orange-50/80"
                  )}
                >
                  <CardHeader className="pb-2 text-right">
                    <CardTitle className="text-base font-semibold leading-snug">
                      {shift.mission_name}
                    </CardTitle>
                    <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-muted-foreground">
                      <span>{formatTimeDisplay(shift.start_time)}</span>
                      <Badge variant="secondary">
                        {SHIFT_TYPE_LABELS[shift.shift_type]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="w-full min-w-0 text-right">
                    <div
                      className={cn(
                        "grid w-full min-w-0 gap-3",
                        teams.length <= 1
                          ? "sm:grid-cols-1"
                          : teams.length === 2
                            ? "sm:grid-cols-2"
                            : "sm:grid-cols-2 lg:grid-cols-3"
                      )}
                    >
                      {teams.map((team) => (
                        <div
                          key={team}
                          className="min-w-0 rounded-lg border border-border/60 bg-card/60 p-3"
                        >
                          <p className="mb-3 text-sm font-medium text-muted-foreground">
                            צוות {team}
                          </p>
                          <ul className="space-y-2 text-sm">
                            {positions.map((pos) => {
                              const a = shift.assignments?.find(
                                (x) => x.team_number === team && x.position === pos
                              );
                              const prof = a?.profiles;
                              const name = prof
                                ? [prof.first_name, prof.last_name].filter(Boolean).join(" ") ||
                                  "—"
                                : "—";
                              const conflict =
                                prof && constrained.has(prof.id);

                              return (
                                <li
                                  key={`${team}-${pos}`}
                                  className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-1 border-b border-border/30 pb-2 last:border-0 last:pb-0"
                                >
                                  <span className="shrink-0 text-muted-foreground">{pos}</span>
                                  <span className="min-w-0 flex-1 break-words text-end font-medium">
                                    {prof ? (
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                                        onClick={() => openContact(prof)}
                                      >
                                        {conflict && (
                                          <AlertTriangleIcon
                                            className="size-4 shrink-0 text-destructive"
                                            aria-label="אילוץ בתאריך זה"
                                          />
                                        )}
                                        {name}
                                      </button>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
