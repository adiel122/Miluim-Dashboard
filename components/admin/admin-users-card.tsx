"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProfileRow } from "@/lib/types/shabtzak";
import { createClient } from "@/src/utils/supabase/client";

type AdminUsersCardProps = {
  profiles: ProfileRow[];
  profileLabel: (p: ProfileRow) => string;
  onChanged: () => void;
};

export function AdminUsersCard({ profiles, profileLabel, onChanged }: AdminUsersCardProps) {
  const toggleAdmin = useCallback(
    async (p: ProfileRow, next: boolean) => {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({ is_admin: next }).eq("id", p.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("הרשאות עודכנו");
      onChanged();
    },
    [onChanged]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>ניהול משתמשים</CardTitle>
        <CardDescription>עריכת הרשאת מנהל לחשבונות רשומים</CardDescription>
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
  );
}
