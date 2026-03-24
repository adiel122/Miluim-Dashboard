"use client";

import { useCallback, useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_ROSTER_POSITIONS } from "@/lib/types/shabtzak";
import { createClient } from "@/src/utils/supabase/client";

export type RosterLayout = {
  team_count: number;
  positions: string[];
};

type RosterLayoutCardProps = {
  onSaved?: (layout: RosterLayout) => void;
};

export function RosterLayoutCard({ onSaved }: RosterLayoutCardProps) {
  const [teamCount, setTeamCount] = useState(3);
  const [positions, setPositions] = useState<string[]>([...DEFAULT_ROSTER_POSITIONS]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("admin_roster_settings")
      .select("team_count, positions")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      setTeamCount(3);
      setPositions([...DEFAULT_ROSTER_POSITIONS]);
      setLoading(false);
      return;
    }
    const pos = (data.positions as string[])?.filter((p) => p.trim().length > 0) ?? [
      ...DEFAULT_ROSTER_POSITIONS,
    ];
    setTeamCount(Math.min(15, Math.max(1, Number(data.team_count) || 3)));
    setPositions(pos.length > 0 ? pos : [...DEFAULT_ROSTER_POSITIONS]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const cleaned = positions.map((p) => p.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast.error("חייב להישאר לפחות תפקיד אחד");
      return;
    }
    if (cleaned.length !== new Set(cleaned).size) {
      toast.error("יש כפילות בשמות תפקידים");
      return;
    }
    const tc = Math.min(15, Math.max(1, teamCount));
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("admin_roster_settings").upsert(
      {
        id: 1,
        team_count: tc,
        positions: cleaned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTeamCount(tc);
    setPositions(cleaned);
    toast.success("מבנה הלוח נשמר");
    onSaved?.({ team_count: tc, positions: cleaned });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>מבנה צוותים ותפקידים</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">טוען…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle>מבנה צוותים ותפקידים</CardTitle>
        <CardDescription>
          מספר צוותים (1–15) ורשימת תפקידים למטריצת השיבוצים ולשבצ״ק. שינוי כאן משפיף על משמרות חדשות
          ועל עריכה נוכחית — שמור שיבוצים מחדש אם צריך.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 overflow-visible">
        <div className="grid gap-2">
          <Label>מספר צוותים</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={teamCount <= 1}
              onClick={() => setTeamCount((n) => Math.max(1, n - 1))}
            >
              −
            </Button>
            <span className="min-w-[2ch] tabular-nums">{teamCount}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={teamCount >= 15}
              onClick={() => setTeamCount((n) => Math.min(15, n + 1))}
            >
              +
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>תפקידים (סדר העמודות במטריצה)</Label>
          <ul className="space-y-2">
            {positions.map((p, idx) => (
              <li key={idx} className="flex gap-2">
                <Input
                  dir="rtl"
                  value={p}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPositions((prev) => {
                      const next = [...prev];
                      next[idx] = v;
                      return next;
                    });
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive"
                  disabled={positions.length <= 1}
                  onClick={() => setPositions((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="הסר תפקיד"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-fit"
            onClick={() => setPositions((prev) => [...prev, `תפקיד ${prev.length + 1}`])}
          >
            <PlusIcon className="me-1 size-4" />
            הוסף תפקיד
          </Button>
        </div>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          שמור מבנה לוח
        </Button>
      </CardContent>
    </Card>
  );
}
