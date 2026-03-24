import { z } from "zod";

export const shiftCreateSchema = z.object({
  shift_date: z.string().min(1, "בחר תאריך"),
  shift_type: z.enum(["day", "night"]),
  mission_name: z.string().trim().min(1, "שם משימה"),
  start_time: z.string().min(1, "בחר שעה"),
});

export type ShiftCreateValues = z.infer<typeof shiftCreateSchema>;
