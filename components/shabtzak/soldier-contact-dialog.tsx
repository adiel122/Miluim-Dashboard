"use client";

import type { ProfileRow } from "@/lib/types/shabtzak";
import { whatsappHref, telHref } from "@/src/lib/phone-links";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SoldierContactDialogProps = {
  profile: ProfileRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SoldierContactDialog({
  profile,
  open,
  onOpenChange,
}: SoldierContactDialogProps) {
  if (!profile) return null;

  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "ללא שם";

  const phone = (profile.phone ?? "").replace(/\D/g, "");
  const canDial = phone.length >= 9;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle className="text-right">{fullName}</DialogTitle>
          <DialogDescription className="text-right">
            {profile.rank ? <>דרגה: {profile.rank}</> : "דרגה לא צוינה"}
            <br />
            {profile.military_id ? (
              <>
                מספר אישי:{" "}
                <span dir="ltr" className="inline-block">
                  {profile.military_id}
                </span>
              </>
            ) : (
              "מספר אישי לא צוין"
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {canDial ? (
            <>
              <a
                href={telHref(phone)}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "flex h-12 w-full items-center justify-center text-base"
                )}
              >
                חיוג לנייד
              </a>
              <a
                href={whatsappHref(phone)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "flex h-12 w-full items-center justify-center text-base"
                )}
              >
                WhatsApp
              </a>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">אין מספר טלפון זמין</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
