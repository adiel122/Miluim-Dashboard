import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin-api";
import {
  createServiceRoleClient,
  MISSING_SERVICE_ROLE_CONFIG_MESSAGE,
} from "@/lib/supabase/service-role";

const bodySchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8, "לפחות 8 תווים").max(72, "סיסמה ארוכה מדי"),
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
      { error: MISSING_SERVICE_ROLE_CONFIG_MESSAGE },
      { status: 500 }
    );
  }

  const { error } = await service.auth.admin.updateUserById(parsed.data.userId, {
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
