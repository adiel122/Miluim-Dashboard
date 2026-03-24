-- מבנה צוותים ותפקידים לכל משמרת (דינמי לכל משימה)
-- הרץ ב-Supabase SQL Editor.

ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS team_count smallint;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS positions text[];

UPDATE public.shifts SET team_count = 3 WHERE team_count IS NULL;
UPDATE public.shifts
SET positions = array['מפקד', 'נהג', 'מחלץ']::text[]
WHERE positions IS NULL;

ALTER TABLE public.shifts ALTER COLUMN team_count SET NOT NULL;
ALTER TABLE public.shifts ALTER COLUMN team_count SET DEFAULT 3;
ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_team_count_range;
ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_team_count_range CHECK (team_count >= 1 AND team_count <= 15);

ALTER TABLE public.shifts ALTER COLUMN positions SET NOT NULL;
ALTER TABLE public.shifts
  ALTER COLUMN positions SET DEFAULT array['מפקד', 'נהג', 'מחלץ']::text[];

COMMENT ON COLUMN public.shifts.team_count IS 'מספר צוותים למשימה זו';
COMMENT ON COLUMN public.shifts.positions IS 'שמות תפקידים (עמודות מטריצה) למשימה זו';
