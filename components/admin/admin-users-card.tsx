"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

function isProfileActive(p: ProfileRow) {
  return p.is_active !== false;
}

export function AdminUsersCard({ profiles, profileLabel, onChanged }: AdminUsersCardProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<ProfileRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [showPasswordPreview, setShowPasswordPreview] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState(DEFAULT_REGISTER_PASSWORD);
  const [addFirst, setAddFirst] = useState("");
  const [addLast, setAddLast] = useState("");
  const [addMid, setAddMid] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addRank, setAddRank] = useState("");
  const [addRole, setAddRole] = useState("");
  const [activeBusyId, setActiveBusyId] = useState<string | null>(null);

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const openPasswordDialog = (p: ProfileRow) => {
    setPasswordTarget(p);
    setNewPassword(DEFAULT_REGISTER_PASSWORD);
    setConfirmPassword(DEFAULT_REGISTER_PASSWORD);
    setShowPasswordPreview(false);
  };

  const closePasswordDialog = (open: boolean) => {
    if (!open) {
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordPreview(false);
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

  const resetAddForm = () => {
    setAddEmail("");
    setAddPassword(DEFAULT_REGISTER_PASSWORD);
    setAddFirst("");
    setAddLast("");
    setAddMid("");
    setAddPhone("");
    setAddRank("");
    setAddRole("");
  };

  const closeAddDialog = (open: boolean) => {
    if (!open) {
      setAddOpen(false);
      resetAddForm();
    }
  };

  const submitAddUser = async () => {
    setAddBusy(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addEmail.trim(),
          password: addPassword,
          first_name: addFirst.trim() || undefined,
          last_name: addLast.trim() || undefined,
          military_id: addMid.trim() || undefined,
          phone: addPhone.trim() || undefined,
          rank: addRank.trim() || undefined,
          role_description: addRole.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        toast.error(data.error ?? "יצירת משתמש נכשלה");
        return;
      }
      toast.success("משתמש נוצר");
      setAddOpen(false);
      resetAddForm();
      onChanged();
    } finally {
      setAddBusy(false);
    }
  };

  const setUserActive = async (p: ProfileRow, active: boolean) => {
    if (p.id === currentUserId && !active) {
      toast.error("לא ניתן להשבית את עצמך");
      return;
    }
    setActiveBusyId(p.id);
    try {
      const res = await fetch("/api/admin/user-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: p.id, active }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "עדכון הסטטוס נכשל");
        return;
      }
      toast.success(active ? "החשבון הופעל" : "החשבון הושבת");
      onChanged();
    } finally {
      setActiveBusyId(null);
    }
  };

  const deleteUser = async (p: ProfileRow) => {
    if (p.id === currentUserId) {
      toast.error("לא ניתן למחוק את עצמך");
      return;
    }
    const ok = window.confirm(
      `מחיקה סופית של ${profileLabel(p)}? לא ניתן לבטל. אישור?`
    );
    if (!ok) return;
    setActiveBusyId(p.id);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: p.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "מחיקה נכשלה");
        return;
      }
      toast.success("המשתמש נמחק");
      onChanged();
    } finally {
      setActiveBusyId(null);
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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>ניהול משתמשים</CardTitle>
            <CardDescription>
              הוספת משתמשים, סיסמה, פעיל / לא פעיל (חסימת התחברות), ומחיקה. דורש ב-Supabase את קובץ{" "}
              <span dir="ltr" className="font-mono text-xs">
                profiles_is_active.sql
              </span>{" "}
              ו־<span className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</span> בשרת.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setAddOpen(true)}>
            הוספת משתמש
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">מספר אישי</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">פעיל</TableHead>
                <TableHead className="text-right">סיסמה</TableHead>
                <TableHead className="text-right">מנהל</TableHead>
                <TableHead className="text-right">מחיקה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const rowBusy = activeBusyId === p.id;
                const self = p.id === currentUserId;
                return (
                  <TableRow
                    key={p.id}
                    className={!isProfileActive(p) ? "opacity-70" : undefined}
                  >
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
                        checked={isProfileActive(p)}
                        disabled={self || rowBusy}
                        onChange={(e) => void setUserActive(p, e.target.checked)}
                        title={self ? "לא ניתן להשבית את עצמך" : undefined}
                        aria-label="פעיל"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        disabled={!isProfileActive(p)}
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
                        disabled={!isProfileActive(p)}
                        onChange={(e) => void toggleAdmin(p, e.target.checked)}
                        aria-label="מנהל"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={self || rowBusy}
                        onClick={() => void deleteUser(p)}
                      >
                        מחק
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={closeAddDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-right">הוספת משתמש</DialogTitle>
            <DialogDescription className="text-right">
              נוצר חשבון Auth עם מייל מאושר; שאר שדות הפרופיל אופציונליים (ניתן להשלים אחר כך).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-right">
            <div className="grid gap-2">
              <Label htmlFor="add-email">מייל — חובה</Label>
              <Input
                id="add-email"
                type="email"
                dir="ltr"
                className="text-left"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-pw">סיסמה</Label>
              <Input
                id="add-pw"
                type="password"
                dir="ltr"
                className="text-left"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-2">
              <div className="grid gap-2">
                <Label htmlFor="add-fn">שם פרטי</Label>
                <Input id="add-fn" value={addFirst} onChange={(e) => setAddFirst(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-ln">שם משפחה</Label>
                <Input id="add-ln" value={addLast} onChange={(e) => setAddLast(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-mid">מספר אישי (7 ספרות)</Label>
              <Input
                id="add-mid"
                dir="ltr"
                className="text-left"
                value={addMid}
                onChange={(e) => setAddMid(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-ph">טלפון</Label>
              <Input
                id="add-ph"
                dir="ltr"
                className="text-left"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-rank">דרגה</Label>
              <Input id="add-rank" value={addRank} onChange={(e) => setAddRank(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-role">תפקיד</Label>
              <Input id="add-role" value={addRole} onChange={(e) => setAddRole(e.target.value)} />
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button type="button" variant="outline" disabled={addBusy} onClick={() => closeAddDialog(false)}>
                ביטול
              </Button>
              <Button
                type="button"
                disabled={addBusy || !addEmail.trim() || addPassword.length < 8}
                onClick={() => void submitAddUser()}
              >
                {addBusy ? "יוצר…" : "יצירת משתמש"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                aria-pressed={showPasswordPreview}
                onClick={() => setShowPasswordPreview((v) => !v)}
              >
                {showPasswordPreview ? (
                  <>
                    <EyeOffIcon className="size-4 shrink-0" aria-hidden />
                    הסתר סיסמה
                  </>
                ) : (
                  <>
                    <EyeIcon className="size-4 shrink-0" aria-hidden />
                    הצג סיסמה (תצוגה מקדימה)
                  </>
                )}
              </Button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-pw-new">סיסמה חדשה</Label>
              <Input
                id="admin-pw-new"
                type={showPasswordPreview ? "text" : "password"}
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
                type={showPasswordPreview ? "text" : "password"}
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
