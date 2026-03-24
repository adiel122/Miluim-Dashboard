/** כפילות במפתח ייחודי (Postgres 23505) */
export function isUniqueViolation(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  const m = (err.message ?? "").toLowerCase();
  return m.includes("duplicate key") || m.includes("unique constraint");
}

export function isPhoneUniqueViolation(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!isUniqueViolation(err)) return false;
  const m = err?.message ?? "";
  return m.includes("profiles_phone_unique") || m.includes("(phone)");
}
