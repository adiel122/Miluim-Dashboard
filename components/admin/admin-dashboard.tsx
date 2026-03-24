"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AssignmentPosition, ProfileRow, ShiftRow } from "@/lib/types/shabtzak";
import { SHIFT_TYPE_LABELS } from "@/lib/types/shabtzak";
import { shiftCreateSchema, type ShiftCreateValues } from "@/lib/validations/shift";
import { formatDateDDMMYY, formatTimeDisplay } from "@/src/lib/date-format";
import { createClient } from "@/src/utils/supabase/client";

const POSITIONS: AssignmentPosition[] = ["מפקד", "נהג", "מחלץ"];
const TEAMS = [1, 2, 3] as const;
const NONE = "__none__";

type ShiftListRow = ShiftRow & {
  assignments?: { profile_id: string; team_number: number; position: string }[];
};

type MatrixKey = `${number}-${AssignmentPosition}`;

export function AdminDashboard() {
  const [upcomingShifts, setUpcomingShifts] = useState(0);
  const [pendingConstraints, setPendingConstraints] = useState(0);
  const [shifts, setShifts] = useState<ShiftListRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [matrix, setMatrix] = useState<Partial<Record<MatrixKey, string>>>({});
  const [constraintIds, setConstraintIds] = useState<Set<string>>(new Set());
  const [loadingMeta, setLoadingMeta] = useState(true);

  const shiftForm = useForm({
    resolver: zodResolver(shiftCreateSchema),
    defaultValues: {
      shift_date: "",
      shift_type: "day" as const,
      mission_name: "כוננות לאתרי הרס",
      start_time: "08:00",
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  const loadSummary = useCallback(async () => {
    const supabase = createClient();
    const { count: sc } = await supabase
      .from("shifts")
      .select("*", { count: "exact", head: true })
      .gte("shift_date", today);

    const { count: cc } = await supabase
      .from("profile_constraints")
      .select("*", { count: "exact", head: true })
      .gte("constraint_date", today);

    setUpcomingShifts(sc ?? 0);
    setPendingConstraints(cc ?? 0);
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
        "id, first_name, last_name, military_id, phone, rank, role_description, is_admin"
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

  useEffect(() => {
    if (!selectedShift) {
      setMatrix({});
      setConstraintIds(new Set());
      return;
    }

    const m: Partial<Record<MatrixKey, string>> = {};
    for (const a of selectedShift.assignments ?? []) {
      const key = `${a.team_number}-${a.position}` as MatrixKey;
      m[key] = a.profile_id;
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

  const profileLabel = (p: ProfileRow) =>
    [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id.slice(0, 8);

  const onCreateShift = shiftForm.handleSubmit(async (raw) => {
    const data = raw as ShiftCreateValues;
    const supabase = createClient();
    const time = data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time;
    const { error } = await supabase.from("shifts").insert({
      shift_date: data.shift_date,
      shift_type: data.shift_type,
      mission_name: data.mission_name.trim(),
      start_time: time,
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
    });
    await loadShifts();
    await loadSummary();
  });

  const saveMatrix = async () => {
    if (!selectedShiftId) {
      toast.error("בחר משמרת");
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
      position: AssignmentPosition;
    }[] = [];

    for (const team of TEAMS) {
      for (const pos of POSITIONS) {
        const key = `${team}-${pos}` as MatrixKey;
        const pid = matrix[key];
        if (pid && pid !== NONE) {
          rows.push({
            shift_id: selectedShiftId,
            profile_id: pid,
            team_number: team,
            position: pos,
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

  const toggleAdmin = async (p: ProfileRow, next: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ is_admin: next }).eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("הרשאות עודכנו");
    await loadProfiles();
  };

  const setCell = (
    team: number,
    pos: AssignmentPosition,
    profileId: string | null | undefined
  ) => {
    const key = `${team}-${pos}` as MatrixKey;
    const v =
      profileId == null || profileId === NONE ? undefined : profileId;
    setMatrix((prev) => ({ ...prev, [key]: v }));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 text-right">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">לוח ניהול</h1>
          <p className="text-sm text-muted-foreground">שבצ״ק — משמרות, שיבוצים ומשתמשים</p>
        </div>
        <Link href="/shabtzak" className={buttonVariants({ variant: "outline", size: "sm" })}>
          לשבצ״ק
        </Link>
      </header>

      {loadingMeta ? (
        <p className="text-muted-foreground">טוען…</p>
      ) : (
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
              <CardTitle className="text-base">אילוצים פעילים</CardTitle>
              <CardDescription>רישומי אילוץ עם תאריך עתידי</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{pendingConstraints}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>יצירת משמרת</CardTitle>
          <CardDescription>תאריך, סוג (יום / לילה), משימה ושעת התחלה</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => void onCreateShift(e)}>
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
            <div className="sm:col-span-2">
              <Button type="submit">שמירת משמרת</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>מטריצת שיבוצים</CardTitle>
          <CardDescription>בחר משמרת, משבצים לפי צוות ותפקיד</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>משמרת</Label>
            <Select
              value={selectedShiftId || NONE}
              onValueChange={(v) =>
                setSelectedShiftId(v == null || v === NONE ? "" : v)
              }
            >
              <SelectTrigger className="w-full justify-between">
                <SelectValue placeholder="בחר משמרת" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {formatDateDDMMYY(s.shift_date)} · {formatTimeDisplay(s.start_time)} ·{" "}
                    {SHIFT_TYPE_LABELS[s.shift_type]} · {s.mission_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedShift && (
            <div className="space-y-4 rounded-lg border border-border/60 p-4">
              {TEAMS.map((team) => (
                <div key={team} className="space-y-3 border-b border-border/40 pb-4 last:border-0 last:pb-0">
                  <p className="font-medium text-muted-foreground">צוות {team}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {POSITIONS.map((pos) => {
                      const key = `${team}-${pos}` as MatrixKey;
                      const val = matrix[key] ?? NONE;
                      const conflict =
                        val !== NONE && constraintIds.has(val);
                      return (
                        <div key={pos} className="grid gap-2">
                          <Label className="flex items-center justify-end gap-1.5 text-xs">
                            {pos}
                            {conflict && (
                              <AlertTriangleIcon
                                className="size-4 shrink-0 text-destructive"
                                aria-label="אילוץ בתאריך המשמרת"
                              />
                            )}
                          </Label>
                          <Select
                            value={val}
                            onValueChange={(v) => setCell(team, pos, v)}
                          >
                            <SelectTrigger className="w-full justify-between text-right">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>ללא</SelectItem>
                              {profiles.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {constraintIds.has(p.id)
                                    ? `${profileLabel(p)} (אילוץ)`
                                    : profileLabel(p)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button type="button" onClick={() => void saveMatrix()}>
                שמור שיבוצים
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ניהול משתמשים</CardTitle>
          <CardDescription>עריכת הרשאת מנהל</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">מספר אישי</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">מנהל</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{profileLabel(p)}</TableCell>
                  <TableCell dir="ltr" className="text-left">
                    {p.military_id ?? "—"}
                  </TableCell>
                  <TableCell dir="ltr" className="text-left">
                    {p.phone ?? "—"}
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={p.is_admin}
                      onChange={(e) => void toggleAdmin(p, e.target.checked)}
                      aria-label="מנהל"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
