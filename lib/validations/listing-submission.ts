import { z } from "zod";

import { IDF_RANKS } from "@/lib/constants/idf-ranks";

const digitsOnly = (s: string) => s.replace(/\D/g, "");

export const listingSubmissionSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "שדה חובה"),
  last_name: z
    .string()
    .trim()
    .min(1, "שדה חובה"),
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
  military_role: z
    .string()
    .trim()
    .min(1, "שדה חובה")
    .max(200, "עד 200 תווים"),
  title: z.string().trim().min(1, "כותרת המודעה חובה").max(200),
  description: z.string().trim().max(5000).optional().default(""),
  rank_required: z.string().trim().max(100).optional().default(""),
  profession: z.string().trim().min(1, "שדה חובה").max(200),
  location: z.string().trim().min(1, "שדה חובה").max(200),
});

/** Parsed values after Zod transforms (e.g. digits-only phone) */
export type ListingSubmissionValues = z.output<typeof listingSubmissionSchema>;

/** Values held in react-hook-form before submit */
export type ListingSubmissionFormValues = z.input<typeof listingSubmissionSchema>;
