import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const bodySchema = z.object({
  userId: z.string().uuid(),
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

  if (parsed.data.userId === admin.userId) {
    return NextResponse.json({ error: "לא ניתן למחוק את עצמך" }, { status: 400 });
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

  const { error } = await service.auth.admin.deleteUser(parsed.data.userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
