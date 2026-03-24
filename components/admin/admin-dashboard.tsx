"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";

import { AfterHoursCard } from "@/components/admin/after-hours-card";
import { AdminUsersCard } from "@/components/admin/admin-users-card";
import { JusticeLeagueCard } from "@/components/admin/justice-league-card";
import { ProfileSearchSelect } from "@/components/admin/profile-search-select";
import { ShiftSearchSelect } from "@/components/admin/shift-search-select";
import { DateFieldCalendar } from "@/components/ui/date-field-calendar";
import { ShiftBoardShiftCards } from "@/components/shabtzak/shift-board-cards";
import { SoldierContactDialog } from "@/components/shabtzak/soldier-contact-dialog";
import { Badge } from "@/components/ui/badge";
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
import { enrichShiftForBoardPreview } from "@/lib/shabtzak/enrich-shift-board";
import {
  layoutFromFormFields,
  parsePositionsInput,
  shiftRosterForDisplay,
} from "@/lib/shabtzak/shift-roster";
import { isMissingRelationError } from "@/lib/supabase/relation-error";
import { timeInputValue } from "@/src/lib/date-format";
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
  assignments?: { id?: string; profile_id: string; team_number: number; position: string }[];
};

const ROSTER_FALLBACK: { team_count: number; positions: string[] } = {
  team_count: 3,
  positions: [...DEFAULT_ROSTER_POSITIONS],
};

type ShiftEditMeta = {
  shift_date: string;
  shift_type: "day" | "night";
  start_time: string;
  end_time: string;
  mission_name: string;
  team_count: number;
  positions_text: string;
};

function matrixKey(team: number, pos: string) {
  return `${team}-${pos}`;
}

function toSqlTime(t: string) {
  return t.length === 5 ? `${t}:00` : t;
}

export function AdminDashboard() {
  const [upcomingShifts, setUpcomingShifts] = useState(0);
  const [afterHoursCount, setAfterHoursCount] = useState(0);
  const [shifts, setShifts] = useState<ShiftListRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [matrix, setMatrix] = useState<Record<string, string | undefined>>({});
  const [constraintIds, setConstraintIds] = useState<Set<string>>(new Set());
  const [createMatrix, setCreateMatrix] = useState<Record<string, string | undefined>>({});
  const [createConstraintIds, setCreateConstraintIds] = useState<Set<string>>(new Set());
  const [editMeta, setEditMeta] = useState<ShiftEditMeta | null>(null);
  const [previewContact, setPreviewContact] = useState<ProfileRow | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewConstraintIds, setPreviewConstraintIds] = useState<Set<string>>(new Set());
  const [loadingMeta, setLoadingMeta] = useState(true);

  const shiftsRef = useRef(shifts);
  shiftsRef.current = shifts;

  const shiftForm = useForm<ShiftCreateFormInput>({
    resolver: zodResolver(shiftCreateSchema),
    defaultValues: {
      shift_date: "",
      shift_type: "day" as const,
      mission_name: "כוננות לאתרי הרס",
      start_time: "08:00",
      end_time: "16:00",
      team_count: 3,
      positions_text: DEFAULT_ROSTER_POSITIONS.join(", "),
    },
  });

  const today = new Date().toISOString().slice(0, 10);

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
        end_time,
        is_published,
        team_count,
        positions,
        assignments ( id, profile_id, team_number, position )
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
    await Promise.all([loadSummary(), loadShifts(), loadProfiles()]);
    setLoadingMeta(false);
  }, [loadProfiles, loadShifts, loadSummary]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const selectedShift = shifts.find((s) => s.id === selectedShiftId);

  const wCreateTeam = shiftForm.watch("team_count");
  const wCreatePos = shiftForm.watch("positions_text");
  const wCreateDate = shiftForm.watch("shift_date");

  const createLayout = useMemo(
    () => layoutFromFormFields(wCreateTeam, wCreatePos ?? "", ROSTER_FALLBACK),
    [wCreateTeam, wCreatePos]
  );

  const createTeamIndices = useMemo(
    () => Array.from({ length: createLayout.team_count }, (_, i) => i + 1),
    [createLayout.team_count]
  );

  const createDuplicateProfileIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const team of createTeamIndices) {
      for (const pos of createLayout.positions) {
        const pid = createMatrix[matrixKey(team, pos)];
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
  }, [createMatrix, createLayout.positions, createTeamIndices]);

  const createMatrixProfileOptions = useMemo(
    () => profilesForAssignmentMatrix(profiles, createMatrix, NONE),
    [profiles, createMatrix]
  );

  const shiftEditSyncKey = useMemo(() => {
    if (!selectedShift) return "";
    return [
      selectedShift.id,
      selectedShift.shift_date,
      selectedShift.shift_type,
      selectedShift.start_time,
      selectedShift.end_time ?? "",
      String(selectedShift.is_published ?? true),
      selectedShift.mission_name,
      selectedShift.team_count,
      (selectedShift.positions ?? []).join("\0"),
    ].join("|");
  }, [selectedShift]);

  const matrixLayout = useMemo(
    () => shiftRosterForDisplay(selectedShift ?? null, ROSTER_FALLBACK),
    [selectedShift]
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
    if (!selectedShift) {
      setPreviewConstraintIds(new Set());
      return;
    }
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profile_constraints")
        .select("profile_id")
        .eq("constraint_date", selectedShift.shift_date);
      setPreviewConstraintIds(new Set((data ?? []).map((c) => c.profile_id as string)));
    })();
  }, [selectedShift?.id, selectedShift?.shift_date]);

  const previewShiftNested = useMemo(() => {
    if (!selectedShift) return null;
    return enrichShiftForBoardPreview(selectedShift, profiles);
  }, [selectedShift, profiles]);

  const previewConstraintMap = useMemo(() => {
    if (!selectedShift) return {};
    return { [selectedShift.shift_date]: previewConstraintIds };
  }, [selectedShift, previewConstraintIds]);

  useEffect(() => {
    const valid = new Set<string>();
    for (let team = 1; team <= createLayout.team_count; team++) {
      for (const pos of createLayout.positions) {
        valid.add(matrixKey(team, pos));
      }
    }
    setCreateMatrix((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (!valid.has(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [createLayout.team_count, createLayout.positions.join("|")]);

  useEffect(() => {
    if (!wCreateDate) {
      setCreateConstraintIds(new Set());
      return;
    }
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profile_constraints")
        .select("profile_id")
        .eq("constraint_date", wCreateDate);
      setCreateConstraintIds(new Set((data ?? []).map((c) => c.profile_id as string)));
    })();
  }, [wCreateDate]);

  useEffect(() => {
    if (!selectedShiftId || !shiftEditSyncKey) {
      setEditMeta(null);
      return;
    }
    const s = shiftsRef.current.find((x) => x.id === selectedShiftId);
    if (!s) {
      setEditMeta(null);
      return;
    }
    const pos = s.positions?.length ? s.positions : [...DEFAULT_ROSTER_POSITIONS];
    setEditMeta({
      shift_date: s.shift_date,
      shift_type: s.shift_type,
      mission_name: s.mission_name,
      start_time: timeInputValue(String(s.start_time)),
      end_time: timeInputValue(String(s.end_time ?? "16:00:00")),
      team_count: s.team_count ?? 3,
      positions_text: pos.join(", "),
    });
  }, [shiftEditSyncKey, selectedShiftId]);

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
    if (p.phone) return p.phone;
    if (p.military_id) return `חייל ${p.military_id}`;
    return p.id.slice(0, 8);
  }, []);

  const onCreateShift = shiftForm.handleSubmit(async (raw) => {
    const data = raw as ShiftCreateValues;
    if (createDuplicateProfileIds.size > 0) {
      toast.error("אותו חייל מסומן ביותר ממשבצת אחת — תקן לפני שמירה");
      return;
    }
    const supabase = createClient();
    const startT = toSqlTime(data.start_time);
    const endT = toSqlTime(data.end_time);
    const positions = parsePositionsInput(data.positions_text);
    const { data: inserted, error } = await supabase
      .from("shifts")
      .insert({
        shift_date: data.shift_date,
        shift_type: data.shift_type,
        mission_name: data.mission_name.trim(),
        start_time: startT,
        end_time: endT,
        team_count: data.team_count,
        positions,
        is_published: false,
      })
      .select("id")
      .single();
    if (error || !inserted?.id) {
      toast.error(error?.message ?? "שגיאה בשמירת משמרת");
      return;
    }

    const assignRows: {
      shift_id: string;
      profile_id: string;
      team_number: number;
      position: string;
    }[] = [];
    for (let team = 1; team <= data.team_count; team++) {
      for (const pos of positions) {
        const pid = createMatrix[matrixKey(team, pos)];
        if (pid && pid !== NONE) {
          assignRows.push({
            shift_id: inserted.id,
            profile_id: pid,
            team_number: team,
            position: pos.trim(),
          });
        }
      }
    }

    if (assignRows.length > 0) {
      const { error: aErr } = await supabase.from("assignments").insert(assignRows);
      if (aErr) {
        await supabase.from("shifts").delete().eq("id", inserted.id);
        toast.error(aErr.message);
        return;
      }
    }

    toast.success("משמרת נוספה כטיוטה עם שיבוצים — פרסם משבצ״ק כשמוכן");
    setCreateMatrix({});
    shiftForm.reset({
      shift_date: "",
      shift_type: "day",
      mission_name: "כוננות לאתרי הרס",
      start_time: "08:00",
      end_time: "16:00",
      team_count: ROSTER_FALLBACK.team_count,
      positions_text: ROSTER_FALLBACK.positions.join(", "),
    });
    await loadShifts();
    await loadSummary();
  });

  const saveShiftMetadata = async () => {
    if (!selectedShift || !editMeta) {
      toast.error("בחר משמרת");
      return;
    }
    const positions = parsePositionsInput(editMeta.positions_text);
    if (positions.length === 0) {
      toast.error("לפחות תפקיד אחד תקין");
      return;
    }
    const tc = Math.min(15, Math.max(1, Math.floor(Number(editMeta.team_count)) || 3));
    const startT = toSqlTime(editMeta.start_time);
    const endT = toSqlTime(editMeta.end_time);
    const supabase = createClient();
    const { error } = await supabase
      .from("shifts")
      .update({
        shift_date: editMeta.shift_date,
        shift_type: editMeta.shift_type,
        mission_name: editMeta.mission_name.trim(),
        start_time: startT,
        end_time: endT,
        team_count: tc,
        positions,
      })
      .eq("id", selectedShift.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    const posSet = new Set(positions);
    const { data: assigns } = await supabase
      .from("assignments")
      .select("id, team_number, position")
      .eq("shift_id", selectedShift.id);
    const orphanIds = (assigns ?? [])
      .filter((a) => a.team_number > tc || !posSet.has(a.position))
      .map((a) => a.id as string);
    if (orphanIds.length > 0) {
      await supabase.from("assignments").delete().in("id", orphanIds);
    }

    toast.success("פרטי המשמרת עודכנו");
    await loadShifts();
    await loadSummary();
  };

  const publishShift = async () => {
    if (!selectedShiftId) {
      toast.error("בחר משמרת");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("shifts")
      .update({ is_published: true })
      .eq("id", selectedShiftId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("פורסם לשבצ״ק הציבורי");
    await loadShifts();
    await loadSummary();
  };

  const unpublishShift = async () => {
    if (!selectedShiftId) {
      toast.error("בחר משמרת");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("shifts")
      .update({ is_published: false })
      .eq("id", selectedShiftId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("המשמרת הוחזרה לטיוטה — לא מוצגת בשבצ״ק");
    await loadShifts();
    await loadSummary();
  };

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

  const setCreateCell = (team: number, pos: string, profileId: string | null | undefined) => {
    const key = matrixKey(team, pos);
    const v =
      profileId == null || profileId === NONE ? undefined : profileId;
    setCreateMatrix((prev) => ({ ...prev, [key]: v }));
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

            <Card>
        <CardHeader>
          <CardTitle>יצירת משמרת</CardTitle>
          <CardDescription>
            תאריך: יומן או הזנה ידנית; שעות התחלה וסיום, מבנה צוותים ושיבוץ חיילים לפני שמירה.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            method="post"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => void onCreateShift(e)}
          >
            <div className="grid gap-2 sm:col-span-2">
              <Label>תאריך</Label>
              <DateFieldCalendar
                idPrefix="ad"
                value={shiftForm.watch("shift_date") ?? ""}
                onChange={(v) =>
                  shiftForm.setValue("shift_date", v, { shouldValidate: true, shouldDirty: true })
                }
              />
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
              <Label htmlFor="ad-time-start">שעת התחלה</Label>
              <div dir="ltr" lang="en" className="isolate [unicode-bidi:isolate]">
                <Input
                  id="ad-time-start"
                  type="time"
                  className="text-left font-mono"
                  {...shiftForm.register("start_time")}
                />
              </div>
              {shiftForm.formState.errors.start_time && (
                <p className="text-sm text-destructive">
                  {shiftForm.formState.errors.start_time.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ad-time-end">שעת סיום</Label>
              <div dir="ltr" lang="en" className="isolate [unicode-bidi:isolate]">
                <Input
                  id="ad-time-end"
                  type="time"
                  className="text-left font-mono"
                  {...shiftForm.register("end_time")}
                />
              </div>
              {shiftForm.formState.errors.end_time && (
                <p className="text-sm text-destructive">
                  {shiftForm.formState.errors.end_time.message}
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

            <div className="space-y-3 sm:col-span-2">
              <p className="text-sm font-medium text-foreground">שיבוץ חיילים למשמרת החדשה</p>
              {createDuplicateProfileIds.size > 0 && (
                <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  יש חיילים שמופיעים יותר מפעם אחת — תקן לפני שמירה.
                </p>
              )}
              <div className="space-y-4 rounded-lg border border-border/60 p-4">
                {createTeamIndices.map((team) => (
                  <div
                    key={team}
                    className="space-y-3 border-b border-border/40 pb-4 last:border-0 last:pb-0"
                  >
                    <p className="font-medium text-muted-foreground">צוות {team}</p>
                    <div className={cnGridForPositions(createLayout.positions.length)}>
                      {createLayout.positions.map((pos) => {
                        const key = matrixKey(team, pos);
                        const val = createMatrix[key] ?? NONE;
                        const conflict = val !== NONE && createConstraintIds.has(val);
                        const dup = val !== NONE && createDuplicateProfileIds.has(val);
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
                              onValueChange={(v) => setCreateCell(team, pos, v)}
                              profiles={createMatrixProfileOptions}
                              noneValue={NONE}
                              profileLabel={profileLabel}
                              hasConstraint={(id) => createConstraintIds.has(id)}
                              invalid={dup}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={createDuplicateProfileIds.size > 0}>
                שמירת משמרת ושיבוצים
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>מטריצת שיבוצים</CardTitle>
          <CardDescription>
            עורכים כאן שיבוצים; למטה תצוגה מקדימה כמו בשבצ״ק. משמרת חדשה נשמרת כטיוטה עד לחיצה על
            &quot;פרסם לשבצ״ק&quot;. כפילות חייל מסומנת באדום לפני שמירה.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 overflow-visible">
          <div
            className="rounded-lg border border-sky-200 bg-sky-50/90 p-3 text-right text-sm text-foreground dark:border-sky-900/60 dark:bg-sky-950/40"
            role="note"
          >
            <p className="font-semibold text-sky-950 dark:text-sky-100">איפה התצוגה המקדימה והפרסום?</p>
            <ol className="mt-2 list-decimal list-inside space-y-1 text-muted-foreground">
              <li>
                בחרו משמרת מהרשימה למטה. אם הרשימה ריקה — יש ליצור משמרת בכרטיס &quot;יצירת משמרת&quot;
                עם תאריך מהיום ואילך.
              </li>
              <li>
                מיד אחרי הבחירה יופיעו: סטטוס <strong>טיוטה / מפורסם</strong>, כפתור{" "}
                <strong>פרסם לשבצ״ק הציבורי</strong> (או החזרה לטיוטה), ואז בלוק{" "}
                <strong>תצוגה מקדימה</strong> ועריכת השיבוץ.
              </li>
            </ol>
          </div>
          <div className="grid min-w-0 gap-2">
            <Label>משמרת</Label>
            <ShiftSearchSelect
              shifts={shifts}
              value={selectedShiftId}
              onValueChange={setSelectedShiftId}
            />
          </div>

          {selectedShift && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {selectedShift.is_published === false ? (
                <Badge variant="outline" className="border-amber-600 text-amber-900">
                  טיוטה
                </Badge>
              ) : (
                <Badge variant="secondary">מפורסם בשבצ״ק</Badge>
              )}
              {selectedShift.is_published === false ? (
                <Button type="button" onClick={() => void publishShift()}>
                  פרסם לשבצ״ק הציבורי
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => void unpublishShift()}>
                  החזר לטיוטה
                </Button>
              )}
            </div>
          )}

          {selectedShift && previewShiftNested && (
            <div className="space-y-3 rounded-lg border border-amber-200/90 bg-amber-50/50 p-4">
              <p className="text-sm font-semibold text-amber-950">תצוגה מקדימה — כמו בשבצ״ק</p>
              <p className="text-xs text-muted-foreground">
                {selectedShift.is_published === false
                  ? "הציבור עדיין לא רואה משמרת זו עד שתפרסם."
                  : "כך נראה הכרטיס בשבצ״ק (לפי הנתונים השמורים)."}
              </p>
              <ShiftBoardShiftCards
                shifts={[previewShiftNested]}
                constraintMap={previewConstraintMap}
                preview
                onOpenContact={(p) => {
                  setPreviewContact(p);
                  setPreviewDialogOpen(true);
                }}
              />
            </div>
          )}

          {selectedShift && editMeta && (
            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-sm font-semibold">עריכת פרטי המשמרת</p>
              <p className="text-xs text-muted-foreground">
                שינוי מספר צוותים או תפקידים מסיר אוטומטית שיבוצים שלא נכנסים למבנה החדש. לעדכון חיילים
                השתמש במטה ב־&quot;שמור שיבוצים&quot;.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label>תאריך</Label>
                  <DateFieldCalendar
                    idPrefix="ed"
                    value={editMeta.shift_date}
                    onChange={(v) => setEditMeta((m) => (m ? { ...m, shift_date: v } : m))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>סוג</Label>
                  <Select
                    value={editMeta.shift_type}
                    onValueChange={(v) =>
                      setEditMeta((m) =>
                        m ? { ...m, shift_type: v as "day" | "night" } : m
                      )
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
                  <Label htmlFor="ed-time-start">שעת התחלה</Label>
                  <div dir="ltr" lang="en" className="isolate [unicode-bidi:isolate]">
                    <Input
                      id="ed-time-start"
                      type="time"
                      className="text-left font-mono"
                      value={editMeta.start_time}
                      onChange={(e) =>
                        setEditMeta((m) => (m ? { ...m, start_time: e.target.value } : m))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ed-time-end">שעת סיום</Label>
                  <div dir="ltr" lang="en" className="isolate [unicode-bidi:isolate]">
                    <Input
                      id="ed-time-end"
                      type="time"
                      className="text-left font-mono"
                      value={editMeta.end_time}
                      onChange={(e) =>
                        setEditMeta((m) => (m ? { ...m, end_time: e.target.value } : m))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="ed-mission">שם משימה</Label>
                  <Input
                    id="ed-mission"
                    dir="rtl"
                    value={editMeta.mission_name}
                    onChange={(e) =>
                      setEditMeta((m) => (m ? { ...m, mission_name: e.target.value } : m))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ed-teams">מספר צוותים</Label>
                  <Input
                    id="ed-teams"
                    type="number"
                    min={1}
                    max={15}
                    dir="ltr"
                    className="text-left"
                    value={editMeta.team_count}
                    onChange={(e) =>
                      setEditMeta((m) =>
                        m ? { ...m, team_count: Number(e.target.value) } : m
                      )
                    }
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="ed-pos">תפקידים (פסיק או שורה)</Label>
                  <Input
                    id="ed-pos"
                    dir="rtl"
                    value={editMeta.positions_text}
                    onChange={(e) =>
                      setEditMeta((m) => (m ? { ...m, positions_text: e.target.value } : m))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button type="button" variant="secondary" onClick={() => void saveShiftMetadata()}>
                    שמור שינויים בפרטי המשמרת
                  </Button>
                </div>
              </div>
            </div>
          )}

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

          <SoldierContactDialog
            profile={previewContact}
            open={previewDialogOpen}
            onOpenChange={setPreviewDialogOpen}
          />
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
