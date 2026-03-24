import type { ShiftBoardShiftNested } from "@/components/shabtzak/shift-board-cards";
import type { ProfileRow, ShiftRow } from "@/lib/types/shabtzak";

type MinimalAssignment = {
  id?: string;
  profile_id: string;
  team_number: number;
  position: string;
};

/** ממלא profiles לשיבוצים — לאותה תצוגה כמו בשבצ״ק הציבורי */
export function enrichShiftForBoardPreview(
  shift: ShiftRow & { assignments?: MinimalAssignment[] | null },
  profiles: ProfileRow[]
): ShiftBoardShiftNested {
  const list = shift.assignments ?? [];
  const assignments = list.map((a, i) => ({
    id: a.id ?? `tmp-${shift.id}-${i}`,
    shift_id: shift.id,
    profile_id: a.profile_id,
    team_number: a.team_number,
    position: a.position,
    profiles: profiles.find((p) => p.id === a.profile_id) ?? null,
  }));
  return { ...shift, assignments };
}
