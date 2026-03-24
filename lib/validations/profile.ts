import { z } from "zod";

import { IDF_RANKS } from "@/lib/constants/idf-ranks";

const digitsOnly = (s: string) => s.replace(/\D/g, "");

/** שדות פרופיל משותפים (הרשמה / השלמת פרופיל) */
export const profileCoreSchema = z.object({
  first_name: z.string().trim().min(1, "שדה חובה"),
  last_name: z.string().trim().min(1, "שדה חובה"),
  military_id: z
    .string()
    .transform(digitsOnly)
    .refine((v) => /^\d{7}$/.test(v), {
      message: "מספר אישי חייב להכיל בדיוק 7 ספרות",
    }),
  phone: z
    .string()
    .transform(digitsOnly)
    .refine((v) => /^0\d{9}$/.test(v), {
      message: "מספר טלפון ישראלי לא תקין (10 ספרות, כולל 0 מוביל)",
    }),
  rank: z.enum(IDF_RANKS, { message: "בחר דרגה" }),
  role_description: z
    .string()
    .trim()
    .min(1, "שדה חובה")
    .max(200, "עד 200 תווים"),
});

export type ProfileCoreValues = z.output<typeof profileCoreSchema>;
export type ProfileFormInput = z.input<typeof profileCoreSchema>;
