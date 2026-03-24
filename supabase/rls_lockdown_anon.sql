-- אבטחה (defense in depth): ביטול גישת תפקיד `anon` לטבלאות האפליקציה.
-- מפתח ה-API הציבורי (anon) נחשף בדפדפן — בלי זה, PostgREST עדיין יכול היה
-- לנסות פעולות; RLS אמור לחסום, אבל כאן נחסום גם ברמת הרשאות הטבלה.
--
-- אחרי הקובץ: רק משתמש מחובר (JWT → תפקיד `authenticated`) יכול לגשת לנתונים,
-- בהתאם למדיניות RLS (לא כולם רואים הכל — אדמין מול חייל, וכו').
--
-- הרצה: Supabase Dashboard → SQL → New query → הדבק והרץ (פרויקט פרודקשן + אם יש סטייג‘).

-- --- ביטול גישת anon ---
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.listings FROM anon;
REVOKE ALL ON TABLE public.shifts FROM anon;
REVOKE ALL ON TABLE public.assignments FROM anon;
REVOKE ALL ON TABLE public.profile_constraints FROM anon;
REVOKE ALL ON TABLE public.admin_roster_settings FROM anon;
REVOKE ALL ON TABLE public.after_hours_outings FROM anon;

-- --- וידוא הרשאות ל-authenticated (RLS ממשיך לסנן שורות) ---
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.listings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profile_constraints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_roster_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.after_hours_outings TO authenticated;

-- --- רשימות (listings): הדגשה — רק משתמשים מחוברים (מדיניות legacy מהסכימה הבסיסית) ---
DROP POLICY IF EXISTS "listings_select_public" ON public.listings;
CREATE POLICY "listings_select_authenticated"
  ON public.listings FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    OR auth.uid() = user_id
  );
