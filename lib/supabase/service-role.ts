import { createClient } from "@supabase/supabase-js";

/** הודעת שגיאה אחידה ל-API כשחסר URL או מפתח שירות */
export const MISSING_SERVICE_ROLE_CONFIG_MESSAGE =
  "חסרה הגדרת Supabase בשרת: הוסף NEXT_PUBLIC_SUPABASE_URL וגם SUPABASE_SERVICE_ROLE_KEY (או SUPABASE_SERVICE_KEY). מקומי: .env.local + הפעלה מחדש של npm run dev. פרודקשן: Vercel → Settings → Environment Variables. ערך המפתח: Supabase → Project Settings → API → service_role (סודי).";

/**
 * מפתח שירות ל-Supabase — רק בשרת (API routes וכו').
 * משתני סביבה נתמכים (לפי סדר): SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_KEY.
 * ב-Vercel: Settings → Environment Variables — הוסף אחד מהם (הערך מ-Supabase Dashboard → Project Settings → API → service_role).
 */
export function getServiceRoleKey(): string | null {
  const raw =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    "";
  return raw.length > 0 ? raw : null;
}

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or service role key (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY)"
    );
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
