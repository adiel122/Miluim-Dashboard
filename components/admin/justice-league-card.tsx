"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DownloadIcon, RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import type { ProfileRow, ShiftType } from "@/lib/types/shabtzak";
import { SHIFT_TYPE_LABELS } from "@/lib/types/shabtzak";
import { isMissingRelationError } from "@/lib/supabase/relation-error";
import { formatDateDDMMYY } from "@/src/lib/date-format";
import { createClient } from "@/src/utils/supabase/client";

import type { AfterHoursRow } from "./after-hours-card";

type ShiftMini = {
  id: string;
  shift_date: string;
  shift_type: ShiftType;
  mission_name: string;
  start_time: string;
};

type RawAssignment = {
  profileId: string;
  shiftId: string;
  shift_date: string;
  shift_type: ShiftType;
  mission_name: string;
  start_time: string;
};

type StatsRow = {
  profileId: string;
  total: number;
  day: number;
  night: number;
  byMission: Record<string, number>;
};

type JusticeLeagueCardProps = {
  profiles: ProfileRow[];
  profileLabel: (p: ProfileRow) => string;
};

type PanelView = "soldiers" | "missions" | "days" | "outings";
type ShiftTypeFilter = "all" | ShiftType;
type SortKey = "total" | "day" | "night" | "name" | "missionCount";
type RosterWho = "soldiers" | "all";

const ALL_MISSIONS = "__all__";

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 2);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  return { from: ymd(from), to: ymd(to) };
}

function ymdShiftDays(fromYmd: string, days: number): string {
  const d = new Date(`${fromYmd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function aggregateProfiles(rows: RawAssignment[]): Map<string, StatsRow> {
  const acc = new Map<string, StatsRow>();
  for (const r of rows) {
    if (!acc.has(r.profileId)) {
      acc.set(r.profileId, {
        profileId: r.profileId,
        total: 0,
        day: 0,
        night: 0,
        byMission: {},
      });
    }
    const s = acc.get(r.profileId)!;
    s.total += 1;
    if (r.shift_type === "day") s.day += 1;
    else s.night += 1;
    const m = r.mission_name?.trim() || "—";
    s.byMission[m] = (s.byMission[m] ?? 0) + 1;
  }
  return acc;
}

export function JusticeLeagueCard({ profiles, profileLabel }: JusticeLeagueCardProps) {
  const [{ from, to }, setRange] = useState(defaultRange);
  const [loading, setLoading] = useState(false);
  const [rawAssignments, setRawAssignments] = useState<RawAssignment[]>([]);
  const [outings, setOutings] = useState<AfterHoursRow[]>([]);

  const [panel, setPanel] = useState<PanelView>("soldiers");
  const [shiftFilter, setShiftFilter] = useState<ShiftTypeFilter>("all");
  const [missionFilter, setMissionFilter] = useState<string>(ALL_MISSIONS);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pivotMissions, setPivotMissions] = useState(false);
  const [showFullRoster, setShowFullRoster] = useState(false);
  const [rosterWho, setRosterWho] = useState<RosterWho>("soldiers");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [outingSearch, setOutingSearch] = useState("");

  const rosterProfiles = useMemo(() => {
    if (rosterWho === "all") return profiles;
    return profiles.filter((p) => !p.is_admin);
  }, [profiles, rosterWho]);

  const uniqueMissions = useMemo(() => {
    const s = new Set<string>();
    for (const r of rawAssignments) {
      s.add(r.mission_name?.trim() || "—");
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "he"));
  }, [rawAssignments]);

  const filteredRaw = useMemo(() => {
    return rawAssignments.filter((r) => {
      if (shiftFilter !== "all" && r.shift_type !== shiftFilter) return false;
      if (missionFilter !== ALL_MISSIONS) {
        const m = r.mission_name?.trim() || "—";
        if (m !== missionFilter) return false;
      }
      return true;
    });
  }, [rawAssignments, shiftFilter, missionFilter]);

  const statsByProfile = useMemo(
    () => aggregateProfiles(filteredRaw),
    [filteredRaw]
  );

  const missionColumns = useMemo(() => {
    const s = new Set<string>();
    for (const r of filteredRaw) {
      s.add(r.mission_name?.trim() || "—");
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "he"));
  }, [filteredRaw]);

  const missionAgg = useMemo(() => {
    const m = new Map<
      string,
      { total: number; day: number; night: number; uniqueSoldiers: Set<string> }
    >();
    for (const r of filteredRaw) {
      const name = r.mission_name?.trim() || "—";
      if (!m.has(name)) {
        m.set(name, {
          total: 0,
          day: 0,
          night: 0,
          uniqueSoldiers: new Set(),
        });
      }
      const row = m.get(name)!;
      row.total += 1;
      if (r.shift_type === "day") row.day += 1;
      else row.night += 1;
      row.uniqueSoldiers.add(r.profileId);
    }
    return Array.from(m.entries())
      .map(([mission, v]) => ({
        mission,
        ...v,
        soldierCount: v.uniqueSoldiers.size,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRaw]);

  const dayAgg = useMemo(() => {
    const m = new Map<string, { total: number; day: number; night: number; soldiers: Set<string> }>();
    for (const r of filteredRaw) {
      const d = r.shift_date;
      if (!m.has(d)) {
        m.set(d, { total: 0, day: 0, night: 0, soldiers: new Set() });
      }
      const row = m.get(d)!;
      row.total += 1;
      if (r.shift_type === "day") row.day += 1;
      else row.night += 1;
      row.soldiers.add(r.profileId);
    }
    return Array.from(m.entries())
      .map(([date, v]) => ({
        date,
        ...v,
        soldierCount: v.soldiers.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRaw]);

  const summary = useMemo(() => {
    const soldiersInData = new Set(filteredRaw.map((r) => r.profileId));
    const shiftsInFilter = new Set(filteredRaw.map((r) => r.shiftId));
    const shiftsLoaded = new Set(rawAssignments.map((r) => r.shiftId));
    return {
      assignmentRows: filteredRaw.length,
      uniqueSoldiers: soldiersInData.size,
      shiftsInFilter: shiftsInFilter.size,
      shiftsLoadedInRange: shiftsLoaded.size,
    };
  }, [filteredRaw, rawAssignments]);

  const soldierRows = useMemo((): StatsRow[] => {
    if (showFullRoster) {
      return rosterProfiles.map((p) => {
        const ex = statsByProfile.get(p.id);
        return (
          ex ?? {
            profileId: p.id,
            total: 0,
            day: 0,
            night: 0,
            byMission: {},
          }
        );
      });
    }
    return Array.from(statsByProfile.values());
  }, [showFullRoster, rosterProfiles, statsByProfile]);

  const displayedSoldiers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = soldierRows;

    if (q) {
      rows = rows.filter((s) => {
        const p = profiles.find((x) => x.id === s.profileId);
        const name = p ? profileLabel(p).toLowerCase() : "";
        const mid = p?.military_id?.toLowerCase() ?? "";
        return name.includes(q) || mid.includes(q) || s.profileId.toLowerCase().includes(q);
      });
    }

    const minN = minTotal.trim() === "" ? null : Number(minTotal);
    const maxN = maxTotal.trim() === "" ? null : Number(maxTotal);
    if (minN != null && !Number.isNaN(minN)) {
      rows = rows.filter((s) => s.total >= minN);
    }
    if (maxN != null && !Number.isNaN(maxN)) {
      rows = rows.filter((s) => s.total <= maxN);
    }

    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "name") {
        const pa = profiles.find((x) => x.id === a.profileId);
        const pb = profiles.find((x) => x.id === b.profileId);
        const na = pa ? profileLabel(pa) : a.profileId;
        const nb = pb ? profileLabel(pb) : b.profileId;
        return na.localeCompare(nb, "he") * dir;
      }
      if (sortKey === "missionCount") {
        const ca = Object.keys(a.byMission).length;
        const cb = Object.keys(b.byMission).length;
        if (ca !== cb) return (ca - cb) * dir;
      }
      const va = a[sortKey === "missionCount" ? "total" : sortKey];
      const vb = b[sortKey === "missionCount" ? "total" : sortKey];
      if (va !== vb) return (va - vb) * dir;
      const pa = profiles.find((x) => x.id === a.profileId);
      const pb = profiles.find((x) => x.id === b.profileId);
      return (pa ? profileLabel(pa) : "").localeCompare(pb ? profileLabel(pb) : "", "he");
    });
  }, [
    soldierRows,
    search,
    minTotal,
    maxTotal,
    sortKey,
    sortDir,
    profiles,
    profileLabel,
  ]);

  const idleSoldiers = useMemo(() => {
    const busy = new Set(statsByProfile.keys());
    return rosterProfiles.filter((p) => !busy.has(p.id));
  }, [rosterProfiles, statsByProfile]);

  const filteredOutings = useMemo(() => {
    const q = outingSearch.trim().toLowerCase();
    if (!q) return outings;
    return outings.filter((r) => {
      const p = profiles.find((x) => x.id === r.profile_id);
      const name = p ? profileLabel(p).toLowerCase() : "";
      const note = (r.note ?? "").toLowerCase();
      return name.includes(q) || note.includes(q) || r.profile_id.toLowerCase().includes(q);
    });
  }, [outings, outingSearch, profiles, profileLabel]);

  const loadOutings = useCallback(
    async (supabase: ReturnType<typeof createClient>) => {
      const { data: oh, error: ohErr } = await supabase
        .from("after_hours_outings")
        .select("id, profile_id, outing_date, end_date, note, created_at")
        .lte("outing_date", to);
      if (ohErr && isMissingRelationError(ohErr)) {
        setOutings([]);
        return;
      }
      const outingsFiltered =
        (oh as AfterHoursRow[] | null)?.filter((r) => {
          const end = r.end_date ?? r.outing_date;
          return end >= from;
        }) ?? [];
      outingsFiltered.sort((a, b) => b.outing_date.localeCompare(a.outing_date));
      setOutings(outingsFiltered);
    },
    [from, to]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: shifts, error: shErr } = await supabase
      .from("shifts")
      .select("id, shift_date, shift_type, mission_name, start_time")
      .gte("shift_date", from)
      .lte("shift_date", to);

    if (shErr || !shifts?.length) {
      setRawAssignments([]);
      await loadOutings(supabase);
      setLoading(false);
      return;
    }

    const shiftMap = Object.fromEntries((shifts as ShiftMini[]).map((s) => [s.id, s]));
    const ids = Object.keys(shiftMap);
    const { data: assigns, error: aErr } = await supabase
      .from("assignments")
      .select("profile_id, shift_id")
      .in("shift_id", ids);

    if (aErr || !assigns) {
      setRawAssignments([]);
      await loadOutings(supabase);
      setLoading(false);
      return;
    }

    const raw: RawAssignment[] = [];
    for (const a of assigns) {
      const sid = a.shift_id as string;
      const sh = shiftMap[sid];
      if (!sh) continue;
      raw.push({
        profileId: a.profile_id as string,
        shiftId: sid,
        shift_date: sh.shift_date,
        shift_type: sh.shift_type,
        mission_name: sh.mission_name,
        start_time: sh.start_time,
      });
    }
    setRawAssignments(raw);
    await loadOutings(supabase);
    setLoading(false);
  }, [from, to, loadOutings]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPreset = (preset: "week" | "month" | "quarter") => {
    const end = new Date();
    const start = new Date();
    if (preset === "week") start.setDate(start.getDate() - 7);
    if (preset === "month") start.setMonth(start.getMonth() - 1);
    if (preset === "quarter") start.setMonth(start.getMonth() - 3);
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    setRange({ from: ymd(start), to: ymd(end) });
  };

  const resetFilters = () => {
    setShiftFilter("all");
    setMissionFilter(ALL_MISSIONS);
    setSearch("");
    setSortKey("total");
    setSortDir("desc");
    setPivotMissions(false);
    setMinTotal("");
    setMaxTotal("");
    setOutingSearch("");
  };

  const exportSoldiersCsv = () => {
    const sep = missionColumns;
    const q = (cell: string) => `"${cell.replaceAll('"', '""')}"`;
    const headers = pivotMissions
      ? ["חייל", "סה״כ", SHIFT_TYPE_LABELS.day, SHIFT_TYPE_LABELS.night, ...sep.map((m) => q(m))].join(
          ","
        )
      : ["חייל", "סה״כ", SHIFT_TYPE_LABELS.day, SHIFT_TYPE_LABELS.night, "פילוח משימות"].join(",");

    const lines = displayedSoldiers.map((s) => {
      const p = profiles.find((x) => x.id === s.profileId);
      const nameRaw = p ? profileLabel(p) : s.profileId;
      if (pivotMissions) {
        const cells = sep.map((m) => String(s.byMission[m] ?? 0));
        return [q(nameRaw), s.total, s.day, s.night, ...cells].join(",");
      }
      const missionBits = Object.entries(s.byMission)
        .map(([k, n]) => `${k}: ${n}`)
        .join(" · ");
      return `${q(nameRaw)},${s.total},${s.day},${s.night},${q(missionBits)}`;
    });

    const bom = "\uFEFF";
    const blob = new Blob([bom + [headers, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `justice-league-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shiftNudge = (delta: number) => {
    setRange((r) => ({
      from: ymdShiftDays(r.from, delta),
      to: ymdShiftDays(r.to, delta),
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>ליגת הצדק</CardTitle>
            <CardDescription>
              ניתוח שיבוצים ואפטר — סינונים, תצוגות ומיון בלי לגעת בנתונים (רענן אחרי שינוי בשרת)
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCwIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
            רענון
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-3 border-b border-border/50 pb-4">
          <div className="grid gap-2">
            <Label htmlFor="jl-from">מתאריך</Label>
            <Input
              id="jl-from"
              type="date"
              dir="ltr"
              value={from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="jl-to">עד תאריך</Label>
            <Input
              id="jl-to"
              type="date"
              dir="ltr"
              value={to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => shiftNudge(-7)}>
              טווח −7 ימים
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => shiftNudge(7)}>
              טווח +7 ימים
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("week")}>
            שבוע אחרון
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("month")}>
            חודש
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("quarter")}>
            3 חודשים
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
            איפוס מסננים
          </Button>
        </div>

        {!loading && (
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{summary.assignmentRows}</strong> שיבוצים (אחרי סינון
              סוג/משימה)
            </span>
            <span>
              <strong className="text-foreground">{summary.uniqueSoldiers}</strong> חיילים ייחודיים
              בשכבה המסוננת
            </span>
            <span>
              <strong className="text-foreground">{summary.shiftsLoadedInRange}</strong> משמרות בטווח
              התאריכים
            </span>
            <span>
              <strong className="text-foreground">{summary.shiftsInFilter}</strong> משמרות נוגעות
              בסינון הנוכחי
            </span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label>תצוגה</Label>
            <Select value={panel} onValueChange={(v) => setPanel(v as PanelView)}>
              <SelectTrigger className="w-full justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soldiers">לפי חייל</SelectItem>
                <SelectItem value="missions">לפי משימה</SelectItem>
                <SelectItem value="days">לפי תאריך</SelectItem>
                <SelectItem value="outings">אפטר בלבד</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>סוג משמרת</Label>
            <Select
              value={shiftFilter}
              onValueChange={(v) => setShiftFilter(v as ShiftTypeFilter)}
            >
              <SelectTrigger className="w-full justify-between">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="day">{SHIFT_TYPE_LABELS.day}</SelectItem>
                <SelectItem value="night">{SHIFT_TYPE_LABELS.night}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2 lg:col-span-2">
            <Label>משימה</Label>
            <Select
              value={missionFilter}
              onValueChange={(v) => setMissionFilter(v ?? ALL_MISSIONS)}
            >
              <SelectTrigger className="w-full justify-between">
                <SelectValue placeholder="כל המשימות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MISSIONS}>כל המשימות</SelectItem>
                {uniqueMissions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {panel === "soldiers" && (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">כלי מיון וטבלה — לפי חייל</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="jl-search">חיפוש חייל</Label>
                <Input
                  id="jl-search"
                  dir="rtl"
                  placeholder="שם / מספר אישי"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>מיין לפי</Label>
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger className="w-full justify-between">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">סה״כ שיבוצים</SelectItem>
                    <SelectItem value="day">{SHIFT_TYPE_LABELS.day}</SelectItem>
                    <SelectItem value="night">{SHIFT_TYPE_LABELS.night}</SelectItem>
                    <SelectItem value="name">שם (א״ב)</SelectItem>
                    <SelectItem value="missionCount">מגוון משימות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>כיוון</Label>
                <Select value={sortDir} onValueChange={(v) => setSortDir(v as "asc" | "desc")}>
                  <SelectTrigger className="w-full justify-between">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">יורד</SelectItem>
                    <SelectItem value="asc">עולה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="jl-min">מינ׳ סה״כ</Label>
                  <Input
                    id="jl-min"
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="—"
                    value={minTotal}
                    onChange={(e) => setMinTotal(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="jl-max">מקס׳ סה״כ</Label>
                  <Input
                    id="jl-max"
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="—"
                    value={maxTotal}
                    onChange={(e) => setMaxTotal(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={pivotMissions}
                  onChange={(e) => setPivotMissions(e.target.checked)}
                />
                עמודות נפרדות לכל משימה
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={showFullRoster}
                  onChange={(e) => setShowFullRoster(e.target.checked)}
                />
                הצג כל הרשימה (כולל 0 שיבוצים)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={rosterWho === "all"}
                  onChange={(e) => setRosterWho(e.target.checked ? "all" : "soldiers")}
                />
                כלול מנהלים בטבלה ובחישוב &quot;לא שובצו&quot;
              </label>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={exportSoldiersCsv}>
              <DownloadIcon className="size-4" />
              ייצוא CSV (מה שמוצג בטבלה)
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">טוען נתונים…</p>
        ) : (
          <>
            {panel === "soldiers" && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">טבלת חיילים</h3>
                <div className="overflow-x-auto rounded-md border">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">חייל</TableHead>
                        <TableHead className="text-right">סה״כ</TableHead>
                        <TableHead className="text-right">{SHIFT_TYPE_LABELS.day}</TableHead>
                        <TableHead className="text-right">{SHIFT_TYPE_LABELS.night}</TableHead>
                        {pivotMissions
                          ? missionColumns.map((m) => (
                              <TableHead key={m} className="max-w-[120px] text-right text-xs">
                                {m}
                              </TableHead>
                            ))
                          : (
                            <TableHead className="text-right">פילוח משימות</TableHead>
                            )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedSoldiers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={pivotMissions ? 4 + missionColumns.length : 5}
                            className="text-center text-muted-foreground"
                          >
                            אין שורות שמתאימות למסננים
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedSoldiers.map((s) => {
                          const p = profiles.find((x) => x.id === s.profileId);
                          const missionBits = Object.entries(s.byMission)
                            .map(([k, n]) => `${k}: ${n}`)
                            .join(" · ");
                          return (
                            <TableRow key={s.profileId}>
                              <TableCell className="font-medium">
                                {p ? profileLabel(p) : s.profileId.slice(0, 8)}
                              </TableCell>
                              <TableCell className="tabular-nums">{s.total}</TableCell>
                              <TableCell className="tabular-nums">{s.day}</TableCell>
                              <TableCell className="tabular-nums">{s.night}</TableCell>
                              {pivotMissions ? (
                                missionColumns.map((m) => (
                                  <TableCell key={m} className="tabular-nums text-xs">
                                    {s.byMission[m] ?? "—"}
                                  </TableCell>
                                ))
                              ) : (
                                <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                                  {missionBits || "—"}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {!showFullRoster && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-destructive">
                      לא שובצו (אחרי סינון משימה/סוג — לא הופיעו בשורות למעלה)
                    </h3>
                    <ul className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {idleSoldiers.length === 0 ? (
                        <li className="text-muted-foreground">אין חיילים בתחום — כולם עם לפחות שיבוץ אחד</li>
                      ) : (
                        idleSoldiers.map((p) => (
                          <li key={p.id}>
                            {profileLabel(p)}
                            {p.military_id ? (
                              <span className="ms-1 text-muted-foreground" dir="ltr">
                                ({p.military_id})
                              </span>
                            ) : null}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {panel === "missions" && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">צבירה לפי משימה</h3>
                <div className="overflow-x-auto rounded-md border">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">משימה</TableHead>
                        <TableHead className="text-right">סה״כ שיבוצים</TableHead>
                        <TableHead className="text-right">{SHIFT_TYPE_LABELS.day}</TableHead>
                        <TableHead className="text-right">{SHIFT_TYPE_LABELS.night}</TableHead>
                        <TableHead className="text-right">חיילים ייחודיים</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missionAgg.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            אין נתונים אחרי הסינון
                          </TableCell>
                        </TableRow>
                      ) : (
                        missionAgg.map((row) => (
                          <TableRow key={row.mission}>
                            <TableCell className="font-medium">{row.mission}</TableCell>
                            <TableCell className="tabular-nums">{row.total}</TableCell>
                            <TableCell className="tabular-nums">{row.day}</TableCell>
                            <TableCell className="tabular-nums">{row.night}</TableCell>
                            <TableCell className="tabular-nums">{row.soldierCount}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {panel === "days" && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">צבירה לפי יום</h3>
                <div className="overflow-x-auto rounded-md border">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">תאריך</TableHead>
                        <TableHead className="text-right">סה״כ</TableHead>
                        <TableHead className="text-right">{SHIFT_TYPE_LABELS.day}</TableHead>
                        <TableHead className="text-right">{SHIFT_TYPE_LABELS.night}</TableHead>
                        <TableHead className="text-right">חיילים ייחודיים</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayAgg.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            אין נתונים אחרי הסינון
                          </TableCell>
                        </TableRow>
                      ) : (
                        dayAgg.map((row) => (
                          <TableRow key={row.date}>
                            <TableCell className="font-medium">{formatDateDDMMYY(row.date)}</TableCell>
                            <TableCell className="tabular-nums">{row.total}</TableCell>
                            <TableCell className="tabular-nums">{row.day}</TableCell>
                            <TableCell className="tabular-nums">{row.night}</TableCell>
                            <TableCell className="tabular-nums">{row.soldierCount}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {panel === "outings" && (
              <div className="space-y-3">
                <div className="grid gap-2 sm:max-w-xs">
                  <Label htmlFor="jl-out-search">חיפוש באפטר</Label>
                  <Input
                    id="jl-out-search"
                    dir="rtl"
                    placeholder="שם / הערה"
                    value={outingSearch}
                    onChange={(e) => setOutingSearch(e.target.value)}
                  />
                </div>
                <h3 className="text-sm font-medium text-foreground">יציאות אפטר בטווח התאריכים</h3>
                <div className="overflow-x-auto rounded-md border">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">חייל</TableHead>
                        <TableHead className="text-right">מ</TableHead>
                        <TableHead className="text-right">עד</TableHead>
                        <TableHead className="text-right">הערה</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOutings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            אין רישומים (או שאין התאמה לחיפוש)
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOutings.map((r) => {
                          const p = profiles.find((x) => x.id === r.profile_id);
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">
                                {p ? profileLabel(p) : r.profile_id.slice(0, 8)}
                              </TableCell>
                              <TableCell>{formatDateDDMMYY(r.outing_date)}</TableCell>
                              <TableCell>
                                {r.end_date ? formatDateDDMMYY(r.end_date) : "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {r.note ?? "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
