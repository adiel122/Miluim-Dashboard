import { z } from "zod";

import { profileCoreSchema } from "@/lib/validations/profile";

export const registrationSchema = profileCoreSchema.extend({
  email: z.string().trim().email("כתובת מייל לא תקינה"),
  password: z
    .string()
    .min(8, "סיסמה: לפחות 8 תווים")
    .max(72, "סיסמה ארוכה מדי"),
});

export type RegistrationValues = z.output<typeof registrationSchema>;
export type RegistrationFormValues = z.input<typeof registrationSchema>;
