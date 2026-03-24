/**
 * מקור ציבורי להפניות (OAuth / אימות מייל).
 *
 * מתי זה חשוב: `new URL(request.url).origin` לפעמים נשאר `http://localhost`
 * (שרת פנימי / פרוקסי). Vercel ורוב ה-Hosting מוסיפים `x-forwarded-host`.
 *
 * ב-Vercel הגדר גם: NEXT_PUBLIC_SITE_URL=https://הדומיין-שלך (גיבוי אם אין headers).
 */
export function getPublicOriginFromRequest(request: Request): string {
  const forwardedRaw = request.headers.get("x-forwarded-host");
  const protoHeader = request.headers.get("x-forwarded-proto");

  if (forwardedRaw) {
    const host = forwardedRaw.split(",")[0].trim();
    const proto = protoHeader?.split(",")[0].trim() || "https";
    return `${proto}://${host}`;
  }

  const fromRequest = new URL(request.url).origin;
  const envSite = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

  if (
    envSite &&
    (fromRequest.includes("localhost") || fromRequest.includes("127.0.0.1"))
  ) {
    return envSite;
  }

  return fromRequest;
}
