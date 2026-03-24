import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types/shabtzak";

export function isProfileComplete(p: ProfileRow | null | undefined): boolean {
  if (!p) return false;
  const fields = [
    p.first_name,
    p.last_name,
    p.military_id,
    p.phone,
    p.rank,
    p.role_description,
  ];
  if (!fields.every((s) => typeof s === "string" && s.trim().length > 0)) {
    return false;
  }
  return (
    /^\d{7}$/.test((p.military_id ?? "").replace(/\D/g, "")) &&
    /^0\d{9}$/.test((p.phone ?? "").replace(/\D/g, ""))
  );
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
