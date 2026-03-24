"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";

import { AfterHoursCard } from "@/components/admin/after-hours-card";
import { AdminUsersCard } from "@/components/admin/admin-users-card";
import { JusticeLeagueCard } from "@/components/admin/justice-league-card";
import { ProfileSearchSelect } from "@/components/admin/profile-search-select";
import { RosterLayoutCard } from "@/components/admin/roster-layout-card";
import { ShiftSearchSelect } from "@/components/admin/shift-search-select";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { profilesForAssignmentMatrix } from "@/lib/shabtzak/profile-filters";
import { parsePositionsInput, shiftRosterForDisplay } from "@/lib/shabtzak/shift-roster";
import { isMissingRelationError } from "@/lib/supabase/relation-error";
import type { ProfileRow, ShiftRow } from "@/lib/types/shabtzak";
import { DEFAULT_ROSTER_POSITIONS, SHIFT_TYPE_LABELS } from "@/lib/types/shabtzak";
import {
  shiftCreateSchema,
  type ShiftCreateFormInput,
  type ShiftCreateValues,
} from "@/lib/validations/shift";
import { createClient } from "@/src/utils/supabase/client";

const NONE = "__none__";

type ShiftListRow = ShiftRow & {
  assignments?: { profile_id: string; team_number: number; position: string }[];
};

type RosterState = {
  team_count: number;
  positions: string[];
};

function matrixKey(team: number, pos: string) {
  return `${team}-${pos}`;
}

export function AdminDashboard() {
  const [upcomingShifts, setUpcomingShifts] = useState(0);
  const [afterHoursCount, setAfterHoursCount] = useState(0);
  const [shifts, setShifts] = useState<ShiftListRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roster, setRoster] = useState<RosterState>({
    team_count: 3,
    positions: [...DEFAULT_ROSTER_POSITIONS],
  });
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [matrix, setMatrix] = useState<Record<string, string | undefined>>({});
  const [constraintIds, setConstraintIds] = useState<Set<string>>(new Set());
  const [loadingMeta, setLoadingMeta] = useState(true);

  const shiftForm = useForm<ShiftCreateFormInput>({
    resolver: zodResolver(shiftCreateSchema),
    defaultValues: {
      shift_date: "",
      shift_type: "day" as const,
      mission_name: "כוננות לאתרי הרס",
      start_time: "08:00",
      team_count: 3,
      positions_text: DEFAULT_ROSTER_POSITIONS.join(", "),
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  const loadRoster = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("admin_roster_settings")
      .select("team_count, positions")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return;
    const pos =
      (data.positions as string[])?.filter((p) => p.trim().length > 0) ??
      [...DEFAULT_ROSTER_POSITIONS];
    setRoster({
      team_count: Math.min(15, Math.max(1, Number(data.team_count) || 3)),
      positions: pos.length > 0 ? pos : [...DEFAULT_ROSTER_POSITIONS],
    });
  }, []);

  const loadSummary = useCallback(async () => {
    const supabase = createClient();
    const { count: sc } = await supabase
      .from("shifts")
      .select("*", { count: "exact", head: true })
      .gte("shift_date", today);

    const { count: ah, error: ahErr } = await supabase
      .from("after_hours_outings")
      .select("*", { count: "exact", head: true });

    setUpcomingShifts(sc ?? 0);
    setAfterHoursCount(ahErr && isMissingRelationError(ahErr) ? 0 : (ah ?? 0));
  }, [today]);

  const loadShifts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("shifts")
      .select(
        `
        id,
        shift_date,
        shift_type,
        mission_name,
        start_time,
        team_count,
        positions,
        assignments ( profile_id, team_number, position )
      `
      )
      .gte("shift_date", today)
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true });
    setShifts((data as ShiftListRow[]) ?? []);
  }, [today]);

  const loadProfiles = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, military_id, phone, rank, role_description, is_admin, is_active"
      )
      .order("last_name", { ascending: true });
    setProfiles((data as ProfileRow[]) ?? []);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoadingMeta(true);
    await Promise.all([loadSummary(), loadShifts(), loadProfiles(), loadRoster()]);
    setLoadingMeta(false);
  }, [loadProfiles, loadRoster, loadShifts, loadSummary]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const selectedShift = shifts.find((s) => s.id === selectedShiftId);

  const matrixLayout = useMemo(
    () => shiftRosterForDisplay(selectedShift ?? null, roster),
    [selectedShift, roster]
  );

  const teamIndices = useMemo(
    () => Array.from({ length: matrixLayout.team_count }, (_, i) => i + 1),
    [matrixLayout.team_count]
  );

  const duplicateProfileIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const team of teamIndices) {
      for (const pos of matrixLayout.positions) {
        const pid = matrix[matrixKey(team, pos)];
        if (pid && pid !== NONE) {
          counts.set(pid, (counts.get(pid) ?? 0) + 1);
        }
      }
    }
    return new Set(
      Array.from(counts.entries())
        .filter(([, n]) => n > 1)
        .map(([id]) => id)
    );
  }, [matrix, matrixLayout.positions, teamIndices]);

  const matrixProfileOptions = useMemo(
    () => profilesForAssignmentMatrix(profiles, matrix, NONE),
    [profiles, matrix]
  );

  useEffect(() => {
    shiftForm.setValue("team_count", roster.team_count);
    shiftForm.setValue("positions_text", roster.positions.join(", "));
  }, [roster.team_count, roster.positions.join("|"), shiftForm]);

  useEffect(() => {
    if (!selectedShift) {
      setMatrix({});
      setConstraintIds(new Set());
      return;
    }

    const m: Record<string, string | undefined> = {};
    for (const a of selectedShift.assignments ?? []) {
      m[matrixKey(a.team_number, a.position)] = a.profile_id;
    }
    setMatrix(m);

    void (async () => {
      const supabase = createClient();
      const { data: cons } = await supabase
        .from("profile_constraints")
        .select("profile_id")
        .eq("constraint_date", selectedShift.shift_date);
      setConstraintIds(new Set((cons ?? []).map((c) => c.profile_id as string)));
    })();
  }, [selectedShift]);

  const profileLabel = useCallback((p: ProfileRow) => {
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
    if (name) return name;
    if (p.military_id) return `חייל ${p.military_id}`;
    return p.id.slice(0, 8);
  }, []);

  const onCreateShift = shiftForm.handleSubmit(async (raw) => {
    const data = raw as ShiftCreateValues;
    const supabase = createClient();
    const time = data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time;
    const positions = parsePositionsInput(data.positions_text);
    const { error } = await supabase.from("shifts").insert({
      shift_date: data.shift_date,
      shift_type: data.shift_type,
      mission_name: data.mission_name.trim(),
      start_time: time,
      team_count: data.team_count,
      positions,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("משמרת נוספה");
    shiftForm.reset({
      shift_date: "",
      shift_type: "day",
      mission_name: "כוננות לאתרי הרס",
      start_time: "08:00",
      team_count: roster.team_count,
      positions_text: roster.positions.join(", "),
    });
    await loadShifts();
    await loadSummary();
  });

  const saveMatrix = async () => {
    if (!selectedShiftId) {
      toast.error("בחר משמרת");
      return;
    }
    if (duplicateProfileIds.size > 0) {
      toast.error("אותו חייל מסומן ביותר ממשבצת אחת — תקן לפני שמירה");
      return;
    }

    const supabase = createClient();
    const { error: delErr } = await supabase
      .from("assignments")
      .delete()
      .eq("shift_id", selectedShiftId);
    if (delErr) {
      toast.error(delErr.message);
      return;
    }

    const rows: {
      shift_id: string;
      profile_id: string;
      team_number: number;
      position: string;
    }[] = [];

    for (const team of teamIndices) {
      for (const pos of matrixLayout.positions) {
        const pid = matrix[matrixKey(team, pos)];
        if (pid && pid !== NONE) {
          rows.push({
            shift_id: selectedShiftId,
            profile_id: pid,
            team_number: team,
            position: pos.trim(),
          });
        }
      }
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("assignments").insert(rows);
      if (insErr) {
        toast.error(insErr.message);
        return;
      }
    }

    toast.success("שיבוצים עודכנו");
    await loadShifts();
    await loadSummary();
  };

  const setCell = (team: number, pos: string, profileId: string | null | undefined) => {
    const key = matrixKey(team, pos);
    const v =
      profileId == null || profileId === NONE ? undefined : profileId;
    setMatrix((prev) => ({ ...prev, [key]: v }));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 text-right">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">לוח ניהול</h1>
          <p className="text-sm text-muted-foreground">
            ניהול משמרות ושיבוצים — ליגת הצדק, אפטר ומשתמשים בטאבים נפרדים
          </p>
        </div>
        <Link href="/shabtzak" className={buttonVariants({ variant: "outline", size: "sm" })}>
          לשבצ״ק
        </Link>
      </header>

      {loadingMeta ? (
        <p className="text-muted-foreground">טוען…</p>
      ) : (
        <Tabs defaultValue="shifts" className="w-full min-w-0">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
            <TabsTrigger value="shifts" className="text-xs sm:text-sm">
              לוח שיבוצים
            </TabsTrigger>
            <TabsTrigger value="justice" className="text-xs sm:text-sm">
              ליגת הצדק
            </TabsTrigger>
            <TabsTrigger value="after" className="text-xs sm:text-sm">
              אפטר
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">
              משתמשים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shifts" className="mt-6 space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">משמרות קרובות</CardTitle>
                  <CardDescription>מתאריך היום ואילך</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums">{upcomingShifts}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">רישומי אפטר</CardTitle>
                  <CardDescription>סה״כ רישומים במערכת</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums">{afterHoursCount}</p>
                </CardContent>
              </Card>
            </div>

            <RosterLayoutCard
              onSaved={(layout) => {
                setRoster(layout);
                void loadShifts();
              }}
            />

            <Card>
        <CardHeader>
          <CardTitle>יצירת משמרת</CardTitle>
          <CardDescription>
            לכל משימה ניתן להגדיר מספר צוותים ותפקידים שונים. ברירת המחדל נטענת מההגדרה הגלובלית
            למעלה — ניתן לשנות לפני שמירה.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            method="post"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => void onCreateShift(e)}
          >
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="ad-date">תאריך</Label>
              <Input id="ad-date" type="date" dir="ltr" {...shiftForm.register("shift_date")} />
              {shiftForm.formState.errors.shift_date && (
                <p className="text-sm text-destructive">
                  {shiftForm.formState.errors.shift_date.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>סוג</Label>
              <Select
                value={shiftForm.watch("shift_type") ?? "day"}
                onValueChange={(v) =>
                  shiftForm.setValue("shift_type", v as "day" | "night", { shouldValidate: true })
                }
              >
                <SelectTrigger className="w-full justify-between">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">{SHIFT_TYPE_LABELS.day}</SelectItem>
                  <SelectItem value="night">{SHIFT_TYPE_LABELS.night}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ad-time">שעת התחלה</Label>
              <Input id="ad-time" type="time" dir="ltr" {...shiftForm.register("start_time")} />
              {shiftForm.formState.errors.start_time && (
                <p className="text-sm text-destructive">
                  {shiftForm.formState.errors.start_time.message}
                </p>
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="ad-mission">שם משימה</Label>
              <Input id="ad-mission" dir="rtl" {...shiftForm.register("mission_name")} />
              {shiftForm.formState.errors.mission_name && (
                <p className="text-sm text-destructive">
                  {shiftForm.formState.errors.mission_name.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ad-teams">מספר צוותים</Label>
              <Input
                id="ad-teams"
                type="number"
                min={1}
                max={15}
                dir="ltr"
                className="text-left"
                {...shiftForm.register("team_count", { valueAsNumber: true })}
              />
              {shiftForm.formState.errors.team_count && (
                <p className="text-sm text-destructive">
                  {shiftForm.formState.errors.team_count.message}
                </p>
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="ad-pos">תפקידים (מופרדים בפסיק או שורה)</Label>
              <Input id="ad-pos" dir="rtl" {...shiftForm.register("positions_text")} />
              {shiftForm.formState.errors.positions_text && (
                <p className="text-sm text-destructive">
                  {shiftForm.formState.errors.positions_text.message}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">שמירת משמרת</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>מטריצת שיבוצים</CardTitle>
          <CardDescription>
            המבנה נלקח מהמשימה שנבחרה (צוותים ותפקידים שנשמרו בה). כפילות חייל מסומנת באדום לפני
            שמירה
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 overflow-visible">
          <div className="grid min-w-0 gap-2">
            <Label>משמרת</Label>
            <ShiftSearchSelect
              shifts={shifts}
              value={selectedShiftId}
              onValueChange={setSelectedShiftId}
            />
          </div>

          {duplicateProfileIds.size > 0 && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              יש חיילים שמופיעים יותר מפעם אחת במשמרת — יש לתקן לפני שמירה.
            </p>
          )}

          {selectedShift && (
            <div className="space-y-4 rounded-lg border border-border/60 p-4">
              {teamIndices.map((team) => (
                <div
                  key={team}
                  className="space-y-3 border-b border-border/40 pb-4 last:border-0 last:pb-0"
                >
                  <p className="font-medium text-muted-foreground">צוות {team}</p>
                  <div
                    className={cnGridForPositions(matrixLayout.positions.length)}
                  >
                    {matrixLayout.positions.map((pos) => {
                      const key = matrixKey(team, pos);
                      const val = matrix[key] ?? NONE;
                      const conflict =
                        val !== NONE && constraintIds.has(val);
                      const dup =
                        val !== NONE && duplicateProfileIds.has(val);
                      return (
                        <div key={key} className="grid min-w-0 gap-2">
                          <Label className="flex items-center justify-end gap-1.5 text-xs">
                            {pos}
                            {conflict && (
                              <AlertTriangleIcon
                                className="size-4 shrink-0 text-destructive"
                                aria-label="אילוץ בתאריך המשמרת"
                              />
                            )}
                          </Label>
                          <ProfileSearchSelect
                            value={val}
                            onValueChange={(v) => setCell(team, pos, v)}
                            profiles={matrixProfileOptions}
                            noneValue={NONE}
                            profileLabel={profileLabel}
                            hasConstraint={(id) => constraintIds.has(id)}
                            invalid={dup}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                disabled={duplicateProfileIds.size > 0}
                onClick={() => void saveMatrix()}
              >
                שמור שיבוצים
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
          </TabsContent>

          <TabsContent value="justice" className="mt-6 w-full min-w-0">
            <JusticeLeagueCard profiles={profiles} profileLabel={profileLabel} />
          </TabsContent>

          <TabsContent value="after" className="mt-6 w-full min-w-0">
            <AfterHoursCard
              profiles={profiles}
              profileLabel={profileLabel}
              onMutate={() => void loadSummary()}
            />
          </TabsContent>

          <TabsContent value="users" className="mt-6 w-full min-w-0">
            <AdminUsersCard
              profiles={profiles}
              profileLabel={profileLabel}
              onChanged={() => void loadProfiles()}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function cnGridForPositions(n: number) {
  if (n <= 1) return "grid min-w-0 gap-3 grid-cols-1";
  if (n === 2) return "grid min-w-0 gap-3 sm:grid-cols-2";
  if (n === 3) return "grid min-w-0 gap-3 sm:grid-cols-3";
  if (n === 4) return "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4";
  return "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
}
