"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { ProfileSearchSelect } from "@/components/admin/profile-search-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type AfterHoursCardProps = {
  profiles: ProfileRow[];
  profileLabel: (p: ProfileRow) => string;
  onMutate?: () => void;
};

export function AfterHoursCard({ profiles, profileLabel, onMutate }: AfterHoursCardProps) {
  const [rows, setRows] = useState<AfterHoursRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(NONE);
  const [outingDate, setOutingDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

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
                  profiles={profiles}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
