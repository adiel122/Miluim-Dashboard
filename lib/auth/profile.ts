import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types/shabtzak";

/** מינימום לגישה ללוח ניהול / שבצ״ק: שם + טלפון תקין בלבד */
export function isProfileComplete(p: ProfileRow | null | undefined): boolean {
  if (!p) return false;
  const fn = (p.first_name ?? "").trim();
  const ln = (p.last_name ?? "").trim();
  const ph = (p.phone ?? "").replace(/\D/g, "");
  if (!fn || !ln) return false;
  return /^0\d{9}$/.test(ph);
}

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, military_id, phone, rank, role_description, is_admin"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProfileRow;
}
