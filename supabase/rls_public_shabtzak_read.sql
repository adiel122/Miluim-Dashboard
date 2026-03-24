-- קריאה ציבורית (anon) ללוח השבצ״ק בלי התחברות
-- דורש עמודת shifts.is_published (אחרת הרץ supabase/shifts_is_published.sql לפני הקובץ).
-- הרץ ב-Supabase SQL Editor אחרי הסכימה.
-- אם הרצת rls_lockdown_anon.sql — קובץ זה מחזיר GRANT SELECT ל-anon על הטבלאות הרלוונטיות
-- ומוסיף מדיניות RLS: רק SELECT, בלי כתיבה.

GRANT SELECT ON TABLE public.shifts TO anon;
GRANT SELECT ON TABLE public.assignments TO anon;
GRANT SELECT ON TABLE public.admin_roster_settings TO anon;
GRANT SELECT ON TABLE public.profile_constraints TO anon;
GRANT SELECT ON TABLE public.profiles TO anon;

DROP POLICY IF EXISTS "shifts_select_anon_public" ON public.shifts;
CREATE POLICY "shifts_select_anon_public"
  ON public.shifts FOR SELECT
  TO anon
  USING (is_published = true);

DROP POLICY IF EXISTS "assignments_select_anon_public" ON public.assignments;
CREATE POLICY "assignments_select_anon_public"
  ON public.assignments FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = assignments.shift_id AND s.is_published = true
    )
  );

DROP POLICY IF EXISTS "admin_roster_settings_select_anon_public" ON public.admin_roster_settings;
CREATE POLICY "admin_roster_settings_select_anon_public"
  ON public.admin_roster_settings FOR SELECT
  TO anon
  USING (true);

-- רק אילוצים בתאריך שיש בו משמרת (פחות חשיפה ממדיניות «הכל»)
DROP POLICY IF EXISTS "profile_constraints_select_anon_public" ON public.profile_constraints;
CREATE POLICY "profile_constraints_select_anon_public"
  ON public.profile_constraints FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.shift_date = profile_constraints.constraint_date
        AND s.is_published = true
    )
  );

-- פרופיל: רק חיילים שמופיעים לפחות בשיבוץ אחד במשמרת מפורסמת
DROP POLICY IF EXISTS "profiles_select_anon_assigned" ON public.profiles;
CREATE POLICY "profiles_select_anon_assigned"
  ON public.profiles FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.assignments a
      JOIN public.shifts s ON s.id = a.shift_id
      WHERE a.profile_id = profiles.id AND s.is_published = true
    )
  );
