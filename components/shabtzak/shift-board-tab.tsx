"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssignmentPosition, AssignmentRow, ProfileRow, ShiftRow } from "@/lib/types/shabtzak";
import { SHIFT_TYPE_LABELS } from "@/lib/types/shabtzak";
import { formatDateDDMMYY, formatTimeDisplay } from "@/src/lib/date-format";
import { createClient } from "@/src/utils/supabase/client";

import { SoldierContactDialog } from "./soldier-contact-dialog";

type AssignmentNested = AssignmentRow & { profiles: ProfileRow | null };
type ShiftNested = ShiftRow & { assignments: AssignmentNested[] };

const POSITIONS: AssignmentPosition[] = ["מפקד", "נהג", "מחלץ"];
const TEAMS = [1, 2, 3] as const;

export function ShiftBoardTab() {
  const [shifts, setShifts] = useState<ShiftNested[]>([]);
  const [constraintMap, setConstraintMap] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<ProfileRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
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
      .gte("shift_date", today)
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error || !shiftRows) {
      setShifts([]);
      setLoading(false);
      return;
    }

    const nested = shiftRows as unknown as ShiftNested[];
    setShifts(nested);

    const shiftDates = Array.from(new Set(nested.map((s) => s.shift_date)));
    if (shiftDates.length === 0) {
      setConstraintMap({});
      setLoading(false);
      return;
    }

    const { data: cons } = await supabase
      .from("profile_constraints")
      .select("profile_id, constraint_date")
      .in("constraint_date", shiftDates);

    const map: Record<string, Set<string>> = {};
    for (const row of cons ?? []) {
      const d = row.constraint_date as string;
      if (!map[d]) map[d] = new Set();
      map[d].add(row.profile_id as string);
    }
    setConstraintMap(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const m = new Map<string, ShiftNested[]>();
    for (const s of shifts) {
      if (!m.has(s.shift_date)) m.set(s.shift_date, []);
      m.get(s.shift_date)!.push(s);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [shifts]);

  const openContact = (p: ProfileRow | null) => {
    if (!p) return;
    setContact(p);
    setDialogOpen(true);
  };

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">טוען משמרות…</p>;
  }

  if (grouped.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        אין משמרות קרובות בלוח.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(([dateKey, dayShifts]) => (
        <section key={dateKey} className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {formatDateDDMMYY(dateKey)}
          </h2>
          <div className="flex flex-col gap-4">
            {dayShifts.map((shift) => {
              const constrained = constraintMap[shift.shift_date] ?? new Set<string>();
              return (
                <Card
                  key={shift.id}
                  className={
                    shift.shift_type === "day"
                      ? "border-blue-200/80 bg-blue-50/80"
                      : "border-orange-200/80 bg-orange-50/80"
                  }
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
                  <CardContent className="space-y-3 text-right">
                    {TEAMS.map((team) => (
                      <div
                        key={team}
                        className="rounded-lg border border-border/60 bg-card/60 p-3"
                      >
                        <p className="mb-2 text-sm font-medium text-muted-foreground">
                          צוות {team}
                        </p>
                        <ul className="space-y-1.5 text-sm">
                          {POSITIONS.map((pos) => {
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
                                className="flex flex-wrap items-center justify-end gap-2"
                              >
                                <span className="text-muted-foreground">{pos}:</span>
                                {prof ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
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
                                  <span>{name}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <SoldierContactDialog
        profile={contact}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
