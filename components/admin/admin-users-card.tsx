"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DEFAULT_REGISTER_PASSWORD } from "@/lib/auth/default-register-password";
import type { ProfileRow } from "@/lib/types/shabtzak";
import { createClient } from "@/src/utils/supabase/client";

type AdminUsersCardProps = {
  profiles: ProfileRow[];
  profileLabel: (p: ProfileRow) => string;
  onChanged: () => void;
};

export function AdminUsersCard({ profiles, profileLabel, onChanged }: AdminUsersCardProps) {
  const [passwordTarget, setPasswordTarget] = useState<ProfileRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const openPasswordDialog = (p: ProfileRow) => {
    setPasswordTarget(p);
    setNewPassword(DEFAULT_REGISTER_PASSWORD);
    setConfirmPassword(DEFAULT_REGISTER_PASSWORD);
  };

  const closePasswordDialog = (open: boolean) => {
    if (!open) {
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const submitPasswordReset = async () => {
    if (!passwordTarget) return;
    if (newPassword.length < 8) {
      toast.error("סיסמה: לפחות 8 תווים");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("הסיסמאות אינן תואמות");
      return;
    }

    setPasswordBusy(true);
    try {
      const res = await fetch("/api/admin/reset-user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: passwordTarget.id, password: newPassword }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        toast.error(data.error ?? "עדכון הסיסמה נכשל");
        return;
      }
      toast.success("הסיסמה עודכנה");
      closePasswordDialog(false);
    } finally {
      setPasswordBusy(false);
    }
  };

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
    <>
      <Card>
        <CardHeader>
          <CardTitle>ניהול משתמשים</CardTitle>
          <CardDescription>
            הרשאת מנהל, ואיפוס או שינוי סיסמה לחשבון (דרך מפתח service בשרת)
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">מספר אישי</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">סיסמה</TableHead>
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={() => openPasswordDialog(p)}
                    >
                      איפוס / שינוי
                    </Button>
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

      <Dialog open={passwordTarget != null} onOpenChange={closePasswordDialog}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-right">
              סיסמה — {passwordTarget ? profileLabel(passwordTarget) : ""}
            </DialogTitle>
            <DialogDescription className="text-right">
              מוגדרת ברירת מחדל ליחידה — ניתן לשנות לפני שמירה. החייל יתחבר עם הסיסמה החדשה.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 text-right">
            <div className="grid gap-2">
              <Label htmlFor="admin-pw-new">סיסמה חדשה</Label>
              <Input
                id="admin-pw-new"
                type="password"
                dir="ltr"
                className="text-left"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-pw-confirm">אימות סיסמה</Label>
              <Input
                id="admin-pw-confirm"
                type="password"
                dir="ltr"
                className="text-left"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => closePasswordDialog(false)}
                disabled={passwordBusy}
              >
                ביטול
              </Button>
              <Button type="button" disabled={passwordBusy} onClick={() => void submitPasswordReset()}>
                {passwordBusy ? "שומר…" : "שמירת סיסמה"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
