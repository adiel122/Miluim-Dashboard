import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 }),
    };
  }

  const { data: row, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !row?.is_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "אין הרשאה" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id };
}
