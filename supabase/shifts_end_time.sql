-- שעת סיום משמרת (בנוסף ל-start_time)
-- הרץ פעם אחת על פרויקט קיים.

ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS end_time time;

UPDATE public.shifts
SET end_time = start_time + interval '8 hours'
WHERE end_time IS NULL;

ALTER TABLE public.shifts ALTER COLUMN end_time SET NOT NULL;

COMMENT ON COLUMN public.shifts.end_time IS 'שעת סיום משמרת (אותו יום לוח; משמרת לילה חוצה יום — עדיין time מקומי)';
