import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const bodySchema = z
  .object({
    email: z.string().trim().email("מייל לא תקין"),
    password: z.string().min(8, "לפחות 8 תווים").max(72, "סיסמה ארוכה מדי"),
    first_name: z.string().trim().optional(),
    last_name: z.string().trim().optional(),
    military_id: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    rank: z.string().trim().optional(),
    role_description: z.string().trim().max(200).optional(),
  })
  .superRefine((val, ctx) => {
    const mid = (val.military_id ?? "").replace(/\D/g, "");
    if (mid.length > 0 && !/^\d{7}$/.test(mid)) {
      ctx.addIssue({ code: "custom", message: "מספר אישי — בדיוק 7 ספרות", path: ["military_id"] });
    }
    const ph = (val.phone ?? "").replace(/\D/g, "");
    if (ph.length > 0 && !/^0\d{9}$/.test(ph)) {
      ctx.addIssue({
        code: "custom",
        message: "טלפון — 10 ספרות עם 0 מוביל",
        path: ["phone"],
      });
    }
  });

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
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
  const militaryId = (b.military_id ?? "").replace(/\D/g, "");
  const phone = (b.phone ?? "").replace(/\D/g, "");
  const meta: Record<string, string> = {};
  if (b.first_name?.trim()) meta.first_name = b.first_name.trim();
  if (b.last_name?.trim()) meta.last_name = b.last_name.trim();
  if (militaryId) meta.military_id = militaryId;
  if (phone) meta.phone = phone;
  if (b.rank?.trim()) meta.rank = b.rank.trim();
  if (b.role_description?.trim()) meta.role_description = b.role_description.trim();

  const { data, error } = await service.auth.admin.createUser({
    email: b.email,
    password: b.password,
    email_confirm: true,
    user_metadata: meta,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "יצירה נכשלה" }, { status: 400 });
  }

  const { error: profErr } = await service.from("profiles").upsert(
    {
      id: data.user.id,
      first_name: b.first_name?.trim() || null,
      last_name: b.last_name?.trim() || null,
      military_id: militaryId || null,
      phone: phone || null,
      rank: b.rank?.trim() || null,
      role_description: b.role_description?.trim() || null,
      is_admin: false,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profErr) {
    await service.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId: data.user.id });
}
