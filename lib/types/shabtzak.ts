export type ShiftType = "day" | "night";

/** תפקיד במשבצת — מחרוזת חופשית לפי הגדרות אדמין (ברירת מחדל היסטורית) */
export type AssignmentPosition = string;

export type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  military_id: string | null;
  phone: string | null;
  rank: string | null;
  role_description: string | null;
  is_admin: boolean;
};

export type ShiftRow = {
  id: string;
  shift_date: string;
  shift_type: ShiftType;
  mission_name: string;
  start_time: string;
};

export type AssignmentRow = {
  id: string;
  shift_id: string;
  profile_id: string;
  team_number: number;
  position: AssignmentPosition;
};

export const DEFAULT_ROSTER_POSITIONS: AssignmentPosition[] = ["מפקד", "נהג", "מחלץ"];

export const POSITION_LABELS: Record<string, string> = {
  מפקד: "מפקד",
  נהג: "נהג",
  מחלץ: "מחלץ",
};

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  day: "יום",
  night: "לילה",
};
