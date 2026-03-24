/** הודעות מובנות לשגיאות Supabase Auth (429, 400 וכו׳) */

type AuthLikeError = {
  message: string;
  status?: number;
  code?: string;
};

export function formatAuthFlowError(error: AuthLikeError | null | undefined): string {
  if (!error?.message) {
    return "שגיאה לא ידועה. נסה שוב בעוד רגע.";
  }

  const status = error.status;
  const msg = error.message;
  const low = msg.toLowerCase();

  if (status === 429) {
    return [
      "הגעת למגבלת קצב של שרת האימות (429).",
      "זה קורה אחרי הרבה ניסיונות הרשמה/התחברות — המתן כמה דקות או נסה רשת אחרת.",
      "ב-Supabase: Dashboard → Project → האם יש Mailer/Rate limits; בדוק גם שלא מריצים את האתר מכלים שחוזרים על הבקשה אוטומטית.",
    ].join(" ");
  }

  if (status === 422 || low.includes("already registered") || low.includes("user already")) {
    return "כתובת המייל כבר רשומה. נסה התחברות או איפוס סיסמה.";
  }

  if (
    status === 400 &&
    (low.includes("password") || low.includes("weak") || error.code === "weak_password")
  ) {
    return "הסיסמה חלשה מדי או לא תואמת את דרישות Supabase. נסה סיסמה ארוכה ומגוונת יותר.";
  }

  if (status === 400) {
    return msg || "בקשה לא תקינה (400). בדוק מייל, סיסמה, ושהמפתחות ב-.env.local נכונים לפרויקט.";
  }

  return msg;
}
