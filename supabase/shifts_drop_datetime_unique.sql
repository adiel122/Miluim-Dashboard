-- מאפשר כמה משמרות באותו תאריך, סוג ושעת התחלה (למשל משימות מקבילות).
-- הרץ פעם אחת על פרויקט קיים שבו נוצר האילוץ הישן.

ALTER TABLE public.shifts
  DROP CONSTRAINT IF EXISTS shifts_shift_date_shift_type_start_time_key;
