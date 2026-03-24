-- מגביל anon + משתמשים רגילים לרואים רק משמרות מפורסמות (אדמין רואה הכל)
-- דורש עמודה is_published (הרץ קודם supabase/shifts_is_published.sql)

-- --- anon: shifts ---
DROP POLICY IF EXISTS "shifts_select_anon_public" ON public.shifts;
CREATE POLICY "shifts_select_anon_public"
  ON public.shifts FOR SELECT
  TO anon
  USING (is_published = true);

-- --- anon: assignments (רק של משמרת מפורסמת) ---
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

-- --- anon: אילוצים רק בתאריך שיש בו משמרת מפורסמת ---
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

-- --- anon: פרופיל רק אם משובץ במשמרת מפורסמת ---
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

-- --- authenticated: משמרות ---
DROP POLICY IF EXISTS "shifts_select_authenticated" ON public.shifts;
CREATE POLICY "shifts_select_authenticated"
  ON public.shifts FOR SELECT
  TO authenticated
  USING (
    COALESCE((SELECT is_admin FROM public.profiles pr WHERE pr.id = auth.uid()), false) = true
    OR is_published = true
  );

-- --- authenticated: שיבוצים ---
DROP POLICY IF EXISTS "assignments_select_authenticated" ON public.assignments;
CREATE POLICY "assignments_select_authenticated"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (
    COALESCE((SELECT is_admin FROM public.profiles pr WHERE pr.id = auth.uid()), false) = true
    OR EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = assignments.shift_id AND s.is_published = true
    )
  );
