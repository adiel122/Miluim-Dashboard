import type { ProfileRow } from "@/lib/types/shabtzak";

/** משתמש פעיל לאפליקציה (ברירת מחדל: פעיל אם העמודה חסרה) */
export function isProfileAppActive(p: ProfileRow): boolean {
  return p.is_active !== false;
}

/** לרשימות נפתחות: רק משתמשים פעילים */
export function filterProfilesForDropdown(profiles: ProfileRow[]): ProfileRow[] {
  return profiles.filter(isProfileAppActive);
}

/**
 * מטריצת שיבוצים: פעילים + לא-פעילים שכבר משובצים במשמרת הנוכחית (להצגת שם / שחרור)
 */
export function profilesForAssignmentMatrix(
  profiles: ProfileRow[],
  matrix: Record<string, string | undefined>,
  noneValue: string
): ProfileRow[] {
  const active = filterProfilesForDropdown(profiles);
  const selected = new Set(
    Object.values(matrix).filter((id): id is string => Boolean(id) && id !== noneValue)
  );
  const staleInactive = profiles.filter((p) => !isProfileAppActive(p) && selected.has(p.id));
  const byId = new Map<string, ProfileRow>();
  for (const p of active) byId.set(p.id, p);
  for (const p of staleInactive) byId.set(p.id, p);
  return Array.from(byId.values());
}
