import type { ShiftRow } from "@/lib/types/shabtzak";
import { DEFAULT_ROSTER_POSITIONS } from "@/lib/types/shabtzak";

export type RosterLayout = {
  team_count: number;
  positions: string[];
};

/** פירוק שדה טקסט מהטופס: פסיקים או שורות */
export function parsePositionsInput(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 48);
}

/** מבנה מטריצה להצגה — משמרת ספציפית או ברירת מחדל מההגדרה הגלובלית */
export function shiftRosterForDisplay(
  shift: Pick<ShiftRow, "team_count" | "positions"> | null | undefined,
  fallback: RosterLayout
): RosterLayout {
  const teamCount = Math.min(
    15,
    Math.max(1, shift?.team_count ?? fallback.team_count)
  );
  const raw = shift?.positions;
  const positions =
    Array.isArray(raw) && raw.some((p) => String(p).trim().length > 0)
      ? raw.map((p) => String(p).trim()).filter(Boolean)
      : fallback.positions.length > 0
        ? fallback.positions
        : [...DEFAULT_ROSTER_POSITIONS];
  return { team_count: teamCount, positions };
}
