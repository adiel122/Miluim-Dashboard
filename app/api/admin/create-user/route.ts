import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin-api";
import { isPhoneUniqueViolation } from "@/lib/supabase/postgres-errors";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { adminCreateUserBodySchema } from "@/lib/validations/profile";

/** כתובת כניסה ל-Supabase Auth כשאין מייל אמיתי (ייחודית לפי טלפון) */
const SYNTHETIC_EMAIL_DOMAIN = "users.invalid";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין" }, { status: 400 });
  }

  const parsed = adminCreateUserBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "נתונים לא תקינים";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let service;
  try {
    service = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      { error: "השרת לא מוגדר עם SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const b = parsed.data;
  const phone = b.phone;

  const { data: phoneTaken } = await service.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (phoneTaken) {
    return NextResponse.json({ error: "מספר הטלפון כבר רשום במערכת" }, { status: 409 });
  }

  const emailTrim = b.email.trim();
  const authEmail =
    emailTrim.length > 0 ? emailTrim.toLowerCase() : `${phone}@${SYNTHETIC_EMAIL_DOMAIN}`;

  const meta: Record<string, string> = {
    first_name: b.first_name,
    last_name: b.last_name,
    phone,
  };
  if (b.military_id) meta.military_id = b.military_id;
  if (b.rank) meta.rank = b.rank;
  if (b.role_description) meta.role_description = b.role_description;

  const { data, error } = await service.auth.admin.createUser({
    email: authEmail,
    password: b.password,
    email_confirm: true,
    user_metadata: meta,
  });

  if (error || !data.user) {
    const msg = error?.message ?? "יצירה נכשלה";
    if (/already|registered|exists|duplicate/i.test(msg)) {
      return NextResponse.json({ error: "כתובת המייל כבר קיימת במערכת" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: profErr } = await service.from("profiles").upsert(
    {
      id: data.user.id,
      first_name: b.first_name,
      last_name: b.last_name,
      military_id: b.military_id ?? null,
      phone,
      rank: b.rank ?? null,
      role_description: b.role_description ?? null,
      is_admin: false,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profErr) {
    await service.auth.admin.deleteUser(data.user.id);
    if (isPhoneUniqueViolation(profErr)) {
      return NextResponse.json({ error: "מספר הטלפון כבר רשום במערכת" }, { status: 409 });
    }
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    userId: data.user.id,
    loginEmail: authEmail,
    usedSyntheticEmail: emailTrim.length === 0,
  });
}
