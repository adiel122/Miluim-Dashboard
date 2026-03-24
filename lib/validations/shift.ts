import { z } from "zod";

import { parsePositionsInput } from "@/lib/shabtzak/shift-roster";

export const shiftCreateSchema = z
  .object({
    shift_date: z.string().min(1, "בחר תאריך"),
    shift_type: z.enum(["day", "night"]),
    mission_name: z.string().trim().min(1, "שם משימה"),
    start_time: z.string().min(1, "בחר שעת התחלה"),
    end_time: z.string().min(1, "בחר שעת סיום"),
    team_count: z.coerce.number().int().min(1, "לפחות צוות אחד").max(15, "עד 15 צוותים"),
    positions_text: z.string().min(1, "הגדר תפקידים (מופרדים בפסיק או שורה)"),
  })
  .superRefine((val, ctx) => {
    const pos = parsePositionsInput(val.positions_text);
    if (pos.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "לפחות תפקיד אחד תקין",
        path: ["positions_text"],
      });
    }
  });

export type ShiftCreateValues = z.output<typeof shiftCreateSchema>;
export type ShiftCreateFormInput = z.input<typeof shiftCreateSchema>;
