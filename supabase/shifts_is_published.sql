-- טיוטה לעומת פרסום לשבצ״ק הציבורי
-- הרץ לפני supabase/rls_published_shifts.sql

ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.shifts.is_published IS
  'false = טיוטה: נראה בניהול ובתצוגה מקדימה בלבד; true = מוצג בשבצ״ק הציבורי';

CREATE INDEX IF NOT EXISTS shifts_published_date_idx ON public.shifts (shift_date)
  WHERE is_published = true;

-- עדכן מדיניות RLS: supabase/rls_published_shifts.sql (או עדכן ידנית את rls_public_shabtzak_read.sql + מדיניות authenticated כב־shabtzak_schema.sql)
