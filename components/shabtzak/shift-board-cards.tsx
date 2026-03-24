"use client";

import { AlertTriangleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { shiftRosterForDisplay } from "@/lib/shabtzak/shift-roster";
import type { AssignmentRow, ProfileRow, ShiftRow } from "@/lib/types/shabtzak";
import { DEFAULT_ROSTER_POSITIONS, SHIFT_TYPE_LABELS } from "@/lib/types/shabtzak";
import { formatTimeRange } from "@/src/lib/date-format";

export type ShiftBoardAssignmentNested = AssignmentRow & { profiles: ProfileRow | null };
export type ShiftBoardShiftNested = ShiftRow & { assignments: ShiftBoardAssignmentNested[] };

export const SHIFT_BOARD_ROSTER_FALLBACK = {
  team_count: 3,
  positions: [...DEFAULT_ROSTER_POSITIONS],
};

export function teamsForShiftBoard(shift: ShiftBoardShiftNested, teamCount: number): number[] {
  const s = new Set<number>();
  for (let t = 1; t <= teamCount; t++) s.add(t);
  for (const a of shift.assignments ?? []) s.add(a.team_number);
  return Array.from(s).sort((a, b) => a - b);
}

export function positionsForShiftBoard(shift: ShiftBoardShiftNested, template: string[]): string[] {
  const fromAssign = new Set((shift.assignments ?? []).map((a) => a.position));
  const ordered: string[] = [...template];
  for (const p of Array.from(fromAssign)) {
    if (!ordered.includes(p)) ordered.push(p);
  }
  return ordered;
}

type ShiftBoardShiftCardsProps = {
  shifts: ShiftBoardShiftNested[];
  constraintMap: Record<string, Set<string>>;
  onOpenContact: (p: ProfileRow) => void;
  /** מסגרת/תווית לתצוגה מקדימה בניהול */
  preview?: boolean;
};

export function ShiftBoardShiftCards({
  shifts,
  constraintMap,
  onOpenContact,
  preview,
}: ShiftBoardShiftCardsProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      {shifts.map((shift) => {
        const constrained = constraintMap[shift.shift_date] ?? new Set<string>();
        const layout = shiftRosterForDisplay(shift, SHIFT_BOARD_ROSTER_FALLBACK);
        const teams = teamsForShiftBoard(shift, layout.team_count);
        const positions = positionsForShiftBoard(shift, layout.positions);
        return (
          <Card
            key={shift.id}
            className={cn(
              "w-full min-w-0 overflow-hidden",
              preview && "ring-2 ring-amber-400/70",
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
                <span>{formatTimeRange(shift.start_time, shift.end_time)}</span>
                <Badge variant="secondary">{SHIFT_TYPE_LABELS[shift.shift_type]}</Badge>
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
                    <p className="mb-3 text-sm font-medium text-muted-foreground">צוות {team}</p>
                    <ul className="space-y-2 text-sm">
                      {positions.map((pos) => {
                        const a = shift.assignments?.find(
                          (x) => x.team_number === team && x.position === pos
                        );
                        const prof = a?.profiles;
                        const name = prof
                          ? [prof.first_name, prof.last_name].filter(Boolean).join(" ") || "—"
                          : "—";
                        const conflict = prof && constrained.has(prof.id);

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
                                  onClick={() => onOpenContact(prof)}
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
  );
}
