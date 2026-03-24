/**
 * סקריפט חד־פעמי: יוצר משתמשי Auth (חיילי דמו) + upsert ל-public.profiles
 *
 * דרישות:
 * 1. ב-.env.local (או משתני סביבה): NEXT_PUBLIC_SUPABASE_URL
 * 2. SUPABASE_SERVICE_ROLE_KEY — מ-Supabase Dashboard → Project Settings → API (מפתח service_role, לא anon)
 *    ⚠️ לעולם אל תחשוף את המפתח בקליינט או ב-git
 *
 * הרצה מהשורש:
 *   node scripts/seed-demo-users.mjs
 *
 * אופציונלי — אחרי יצירת משתמשים, משמרת דמו + שיבוצים (דורש טבלאות shabtzak):
 *   node scripts/seed-demo-users.mjs --with-shift
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotenvFile(relPath) {
  const p = join(__dirname, "..", relPath);
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotenvFile(".env.local");

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !serviceRole) {
  console.error(
    "חסר NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY.\n" +
      "הוסף ל-.env.local את מפתח service_role מהדשבורד (API → service_role)."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || "DemoSoldier1!Strong";

const FIRST_NAMES = [
  "יואב",
  "דנה",
  "עומר",
  "נועה",
  "איתי",
  "שרה",
  "דוד",
  "מיכל",
  "רועי",
  "תמר",
  "גל",
  "אלון",
  "ליאור",
  "יעל",
  "אמיר",
  "הילה",
  "ניב",
  "שי",
  "רוני",
  "עידן",
];

const LAST_NAMES = [
  "כהן",
  "לוי",
  "מזרחי",
  "אברהם",
  "דוידי",
  "פרידמן",
  "שפירא",
  "גרין",
  "אורון",
  "ביטון",
];

const RANKS = ["רב טוראי", "טוראי", "סמל", "סמל ראשון", "רב סמל"];
const ROLES = ["לוחם", "נהג", "מחלץ", "קשר", "רפואה", "לוגיסטיקה"];

/** 30 חיילים שונים + מפקד/מנהל אחד (סה״כ 31 משתמשים) */
function buildDemoUsers() {
  const rows = [];
  for (let i = 1; i <= 30; i++) {
    const militaryId = String(3000000 + i);
    rows.push({
      email: `soldier${i}@demo.local`,
      first_name: FIRST_NAMES[(i - 1) % FIRST_NAMES.length],
      last_name: LAST_NAMES[(i + Math.floor(i / 3)) % LAST_NAMES.length],
      military_id: militaryId,
      phone: `05${String(i).padStart(8, "0")}`,
      rank: RANKS[(i - 1) % RANKS.length],
      role_description: ROLES[(i - 1) % ROLES.length],
      is_admin: false,
    });
  }
  rows.push({
    email: "commander@demo.local",
    first_name: "נועה",
    last_name: "אדמין",
    military_id: "3000999",
    phone: "0599990999",
    rank: "רב סרן",
    role_description: "מפקד",
    is_admin: true,
  });
  return rows;
}

const DEMO_USERS = buildDemoUsers();

async function findUserIdByEmail(email) {
  const perPage = 200;
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u) return u.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function ensureAuthUser(row) {
  const { email, ...meta } = row;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: meta.first_name,
      last_name: meta.last_name,
      military_id: meta.military_id,
      phone: meta.phone,
      rank: meta.rank,
      role_description: meta.role_description,
    },
  });

  if (!error && data.user) {
    console.log(`נוצר משתמש Auth: ${email} (${data.user.id})`);
    return data.user.id;
  }

  const msg = error?.message || "";
  if (/already|duplicate|registered/i.test(msg)) {
    const id = await findUserIdByEmail(email);
    if (id) {
      console.log(`משתמש כבר קיים: ${email} (${id}) — מעדכן פרופיל`);
      return id;
    }
  }
  throw new Error(`${email}: ${msg || JSON.stringify(error)}`);
}

async function upsertProfile(userId, row) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      first_name: row.first_name,
      last_name: row.last_name,
      military_id: row.military_id,
      phone: row.phone,
      rank: row.rank,
      role_description: row.role_description,
      is_admin: row.is_admin,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
  console.log(`  פרופיל נשמר: ${row.military_id} ${row.first_name} ${row.last_name}`);
}

async function seedShiftAndAssignments(seeded) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const shiftDate = `${y}-${m}-${d}`;

  let shiftId;
  const { data: existing } = await supabase
    .from("shifts")
    .select("id")
    .eq("shift_date", shiftDate)
    .eq("shift_type", "day")
    .eq("start_time", "08:00:00")
    .maybeSingle();

  if (existing?.id) {
    shiftId = existing.id;
    console.log(`משמרת דמו כבר קיימת ב-${shiftDate}, משתמש ב-id ${shiftId}`);
  } else {
    const { data: shift, error: shErr } = await supabase
      .from("shifts")
      .insert({
        shift_date: shiftDate,
        shift_type: "day",
        mission_name: "כוננות דמו",
        start_time: "08:00:00",
      })
      .select("id")
      .single();
    if (shErr) {
      console.warn("דילג על משמרת דמו:", shErr.message);
      return;
    }
    shiftId = shift.id;
  }

  const nonAdminIds = seeded
    .filter((s) => !s.row.is_admin)
    .map((s) => s.userId);
  const picks = nonAdminIds.slice(0, 9);
  const positions = ["מפקד", "נהג", "מחלץ"];
  const assignmentRows = [];
  for (let t = 0; t < 3; t++) {
    for (let p = 0; p < 3; p++) {
      const idx = t * 3 + p;
      const profileId = picks[idx];
      if (profileId) {
        assignmentRows.push({
          shift_id: shiftId,
          profile_id: profileId,
          team_number: t + 1,
          position: positions[p],
        });
      }
    }
  }

  if (assignmentRows.length > 0) {
    await supabase.from("assignments").delete().eq("shift_id", shiftId);
    const { error: insErr } = await supabase
      .from("assignments")
      .insert(assignmentRows);
    if (insErr) console.warn("שיבוצי דמו:", insErr.message);
    else
      console.log(
        `עודכנו שיבוצים למשמרת ${shiftDate}: ${assignmentRows.length} תפקידים (צוותים 1–3)`
      );
  }
}

async function main() {
  const withShift = process.argv.includes("--with-shift");
  const seeded = [];

  console.log("מפתח: service role (שרת בלבד) — לא להעביר לדפדפן\n");
  console.log(`יוצרים / מעדכנים ${DEMO_USERS.length} משתמשי דמו (30 חיילים + מפקד).\n`);

  for (const row of DEMO_USERS) {
    const userId = await ensureAuthUser(row);
    await upsertProfile(userId, row);
    seeded.push({ userId, row });
  }

  if (withShift) {
    await seedShiftAndAssignments(seeded);
  }

  console.log("\nסיום.");
  console.log(`סיסמת דמו לכולם (אם נוצרו עכשיו): ${DEMO_PASSWORD}`);
  console.log("ניתן לדרוס עם DEMO_SEED_PASSWORD בסביבה לפני ההרצה.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
