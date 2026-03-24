import { z } from "zod";

import { IDF_RANKS } from "@/lib/constants/idf-ranks";

const digitsOnly = (s: string) => s.replace(/\D/g, "");

/** שם + טלפון — חובה בהרשמה / השלמת פרופיל */
export const profileMinimalSchema = z.object({
  first_name: z.string().trim().min(1, "שדה חובה"),
  last_name: z.string().trim().min(1, "שדה חובה"),
  phone: z
    .string()
    .transform(digitsOnly)
    .refine((v) => /^0\d{9}$/.test(v), {
      message: "מספר טלפון ישראלי לא תקין (10 ספרות, כולל 0 מוביל)",
    }),
});

/** שדות נוספים — לא חובה */
export const profileOptionalFieldsSchema = z.object({
  military_id: z.preprocess(
    (v) => digitsOnly(String(v ?? "")),
    z
      .string()
      .refine((v) => v === "" || /^\d{7}$/.test(v), {
        message: "מספר אישי — בדיוק 7 ספרות או ריק",
      })
      .transform((v) => (v === "" ? undefined : v))
  ),
  rank: z.enum(IDF_RANKS as unknown as [string, ...string[]]).optional(),
  role_description: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim())
    .refine((s) => s.length <= 200, { message: "עד 200 תווים" })
    .transform((s) => (s === "" ? undefined : s)),
});

/** הרשמה + השלמת פרופיל: חובה שם וטלפון; השאר אופציונלי */
export const profileCoreSchema = profileMinimalSchema.merge(profileOptionalFieldsSchema);

export type ProfileMinimalValues = z.output<typeof profileMinimalSchema>;
export type ProfileCoreValues = z.output<typeof profileCoreSchema>;
export type ProfileFormInput = z.input<typeof profileCoreSchema>;

/** יצירת משתמש מלוח ניהול: כמו פרופיל מלא + סיסמה; מייל אופציונלי (בלי מייל — מזהה טכני מטלפון) */
export const adminCreateUserBodySchema = profileCoreSchema
  .extend({
    email: z
      .union([z.string(), z.undefined(), z.null()])
      .transform((s) => (s ?? "").trim()),
    password: z.string().min(8, "לפחות 8 תווים").max(72, "סיסמה ארוכה מדי"),
  })
  .superRefine((val, ctx) => {
    if (val.email.length > 0 && !z.string().email().safeParse(val.email).success) {
      ctx.addIssue({ code: "custom", message: "מייל לא תקין", path: ["email"] });
    }
  });

export type AdminCreateUserBody = z.output<typeof adminCreateUserBodySchema>;
