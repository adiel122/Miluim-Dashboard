import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin-api";
import {
  createServiceRoleClient,
  MISSING_SERVICE_ROLE_CONFIG_MESSAGE,
} from "@/lib/supabase/service-role";

const LONG_BAN = "876000h";

const bodySchema = z.object({
  userId: z.string().uuid(),
  active: z.boolean(),
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
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  if (parsed.data.userId === admin.userId && !parsed.data.active) {
    return NextResponse.json({ error: "לא ניתן להשבית את עצמך" }, { status: 400 });
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

  const { error: authErr } = await service.auth.admin.updateUserById(parsed.data.userId, {
    ban_duration: parsed.data.active ? "none" : LONG_BAN,
  });

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 400 });
  }

  const { error: profErr } = await service
    .from("profiles")
    .update({ is_active: parsed.data.active, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.userId);

  if (profErr) {
    await service.auth.admin.updateUserById(parsed.data.userId, { ban_duration: "none" });
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
