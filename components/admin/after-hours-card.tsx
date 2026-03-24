"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { ProfileSearchSelect } from "@/components/admin/profile-search-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateFieldCalendar } from "@/components/ui/date-field-calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { filterProfilesForDropdown } from "@/lib/shabtzak/profile-filters";
import type { ProfileRow } from "@/lib/types/shabtzak";
import { isMissingRelationError } from "@/lib/supabase/relation-error";
import { formatDateDDMMYY } from "@/src/lib/date-format";
import { createClient } from "@/src/utils/supabase/client";

const NONE = "__none__";

export type AfterHoursRow = {
  id: string;
  profile_id: string;
  outing_date: string;
  end_date: string | null;
  note: string | null;
  created_at: string;
};

/** חייל &quot;בבית&quot; (באפטר) אם בתאריך הנתון הוא בתוך טווח יציאה–סיום */
export function isProfileOnAfterHoursAtDate(
  profileId: string,
  dateYmd: string,
  outings: AfterHoursRow[]
): boolean {
  return outings.some((r) => {
    if (r.profile_id !== profileId) return false;
    if (dateYmd < r.outing_date) return false;
    if (r.end_date != null && dateYmd > r.end_date) return false;
    return true;
  });
}

type AfterHoursCardProps = {
  profiles: ProfileRow[];
  profileLabel: (p: ProfileRow) => string;
  onMutate?: () => void;
};

export function AfterHoursCard({ profiles, profileLabel, onMutate }: AfterHoursCardProps) {
  const profilesForSelect = useMemo(() => filterProfilesForDropdown(profiles), [profiles]);

  const [rows, setRows] = useState<AfterHoursRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(NONE);
  const [outingDate, setOutingDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [presenceDate, setPresenceDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setTableMissing(false);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("after_hours_outings")
      .select("id, profile_id, outing_date, end_date, note, created_at")
      .order("outing_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      setRows([]);
      setTableMissing(isMissingRelationError(error));
      if (!isMissingRelationError(error)) {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }
    setRows((data as AfterHoursRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (profileId === NONE || !profileId) return;
    if (!profilesForSelect.some((p) => p.id === profileId)) {
      setProfileId(NONE);
    }
  }, [profileId, profilesForSelect]);

  const addRow = async () => {
    if (!outingDate) {
      toast.error("בחר תאריך יציאה");
      return;
    }
    if (profileId === NONE || !profileId) {
      toast.error("בחר חייל");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("after_hours_outings").insert({
      profile_id: profileId,
      outing_date: outingDate,
      end_date: endDate || null,
      note: note.trim() || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("נרשמה יציאת אפטר");
    setProfileId(NONE);
    setOutingDate("");
    setEndDate("");
    setNote("");
    await load();
    onMutate?.();
  };

  const remove = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("after_hours_outings").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("נמחק");
    await load();
    onMutate?.();
  };

  const { atBase, atHome } = useMemo(() => {
    const home: ProfileRow[] = [];
    const base: ProfileRow[] = [];
    for (const p of profilesForSelect) {
      if (isProfileOnAfterHoursAtDate(p.id, presenceDate, rows)) home.push(p);
      else base.push(p);
    }
    const byLabel = (a: ProfileRow, b: ProfileRow) =>
      profileLabel(a).localeCompare(profileLabel(b), "he");
    home.sort(byLabel);
    base.sort(byLabel);
    return { atBase: base, atHome: home };
  }, [profilesForSelect, presenceDate, rows, profileLabel]);

  const renderPresenceList = (list: ProfileRow[]) =>
    list.length === 0 ? (
      <p className="text-sm text-muted-foreground">אין רשומים</p>
    ) : (
      <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">
        {list.map((p) => (
          <li key={p.id} className="rounded-sm px-1 py-0.5 hover:bg-muted/50">
            <span className="font-medium">{profileLabel(p)}</span>
            {p.phone ? (
              <span dir="ltr" className="ms-2 text-xs text-muted-foreground">
                {p.phone}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>רישום אפטר</CardTitle>
        <CardDescription>מנהל רושם מי יצא לאפטר ולאילו תאריכים (מוצג בליגת הצדק)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tableMissing && (
          <div
            role="alert"
            className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
          >
            טבלת <code className="rounded bg-background/60 px-1">after_hours_outings</code> לא קיימת
            בפרויקט Supabase שלך. הרץ ב־SQL Editor את הקובץ{" "}
            <code className="rounded bg-background/60 px-1">supabase/shabtzak_schema.sql</code>{" "}
            (או את החלק הרלוונטי ממנו), ואז רענן את עמוד ה־Schema בלוח הבקרה אם צריך.
          </div>
        )}
        {loading ? (
          <p className="text-muted-foreground">טוען…</p>
        ) : tableMissing ? null : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label>חייל</Label>
                <ProfileSearchSelect
                  value={profileId === NONE ? NONE : profileId}
                  onValueChange={(v) => setProfileId(v)}
                  profiles={profilesForSelect}
                  noneValue={NONE}
                  profileLabel={profileLabel}
                  hasConstraint={() => false}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ah-start">תאריך יציאה (חובה)</Label>
                <Input
                  id="ah-start"
                  type="date"
                  dir="ltr"
                  value={outingDate}
                  onChange={(e) => setOutingDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ah-end">תאריך סיום (אופציונלי)</Label>
                <Input
                  id="ah-end"
                  type="date"
                  dir="ltr"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="ah-note">הערה</Label>
                <Input
                  id="ah-note"
                  dir="rtl"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="למשל: כוננות מחוץ לבסיס"
                />
              </div>
            </div>
            <Button type="button" disabled={saving} onClick={() => void addRow()}>
              הוסף רישום
            </Button>

            <div className="overflow-x-auto rounded-md border">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">חייל</TableHead>
                    <TableHead className="text-right">מתאריך</TableHead>
                    <TableHead className="text-right">עד</TableHead>
                    <TableHead className="text-right">הערה</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        אין רישומים
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
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
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {r.note ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => void remove(r.id)}
                              aria-label="מחק"
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <section className="space-y-4 border-t border-border pt-8" aria-label="נוכחות לפי תאריך">
              <div>
                <h3 className="text-base font-semibold">מי בבסיס / מי בבית (אפטר)</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  בוחרים תאריך: חייל עם רישום אפטר שמכסה את התאריך (מ־תאריך יציאה עד תאריך סיום כולל, או בלי
                  תאריך סיום) מסומן תחת &quot;בבית&quot;. שאר החיילים הפעילים — תחת &quot;בבסיס&quot;.
                </p>
              </div>
              <div className="grid max-w-lg gap-2">
                <Label>תאריך לסינון</Label>
                <DateFieldCalendar
                  idPrefix="ah-presence"
                  value={presenceDate}
                  onChange={setPresenceDate}
                />
                <p className="text-xs text-muted-foreground">מציגים לפי {formatDateDDMMYY(presenceDate)}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-4">
                  <h4 className="mb-3 text-sm font-semibold">בבסיס ({atBase.length})</h4>
                  {renderPresenceList(atBase)}
                </div>
                <div className="rounded-lg border border-sky-200/90 bg-sky-50/70 p-4 dark:border-sky-900/80 dark:bg-sky-950/35">
                  <h4 className="mb-3 text-sm font-semibold">בבית / אפטר ({atHome.length})</h4>
                  {renderPresenceList(atHome)}
                </div>
              </div>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
