"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IDF_RANKS, MILITARY_ROLE_SUGGESTIONS } from "@/lib/constants/idf-ranks";
import { formatAuthFlowError } from "@/lib/supabase/errors";
import {
  registrationSchema,
  type RegistrationFormValues,
  type RegistrationValues,
} from "@/lib/validations/registration";
import { createClient } from "@/src/utils/supabase/client";

const defaultValues: Partial<RegistrationFormValues> = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  military_id: "",
  phone: "",
  rank: undefined,
  role_description: "",
};

export function RegistrationForm() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (!sp.has("password")) return;
    window.history.replaceState({}, "", window.location.pathname);
    toast.error(
      "הסיסמה הופיעה בכתובת (שליחת טופס בלי JS). כנראה קבצי Next לא נטענו — מחק תיקיית .next, עצור והרץ שוב npm run dev, וודא שאתה על אותו פורט. מומלץ להחליף סיסמה."
    );
  }, []);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues,
    mode: "onTouched",
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (raw) => {
    const data = raw as RegistrationValues;
    const supabase = createClient();

    const meta = {
      first_name: data.first_name,
      last_name: data.last_name,
      military_id: data.military_id,
      phone: data.phone,
      rank: data.rank,
      role_description: data.role_description,
    };

    const redirect =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

    const { data: auth, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: meta,
        emailRedirectTo: redirect,
      },
    });

    if (signUpError) {
      toast.error(formatAuthFlowError(signUpError));
      return;
    }

    if (auth.session && auth.user) {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: auth.user.id,
          ...meta,
        },
        { onConflict: "id" }
      );
      if (profileError) {
        console.error(profileError);
        toast.error(profileError.message || "שגיאה בשמירת הפרופיל");
        return;
      }
      toast.success("נרשמת בהצלחה");
      return;
    }

    toast.success(
      "נרשמת בהצלחה. אם נדרש אישור מייל — לחץ על הקישור שנשלח; הפרופיל ייווצר אוטומטית אחרי אישור (טריגר ב-Supabase)."
    );
  });

  return (
    <Card className="w-full max-w-xl border-border/80 shadow-sm">
      <CardHeader className="text-right">
        <CardTitle className="text-xl">הרשמה</CardTitle>
        <CardDescription>
          יצירת חשבון עם פרטי מילואים. כבר רשום?{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            התחברות
          </Link>
        </CardDescription>
      </CardHeader>
      <form method="post" onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-5 text-right">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="reg-email">מייל</Label>
              <Input
                id="reg-email"
                type="email"
                dir="ltr"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="reg-password">סיסמה</Label>
              <Input
                id="reg-password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div
            role="group"
            aria-label="פרטים אישיים"
            className="grid gap-4 rounded-lg border border-border/60 bg-muted/20 p-4"
          >
            <p className="text-sm font-medium text-muted-foreground">פרטים אישיים</p>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-first_name">שם</Label>
                <Input
                  id="reg-first_name"
                  dir="rtl"
                  autoComplete="given-name"
                  aria-invalid={!!errors.first_name}
                  {...register("first_name")}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-last_name">שם משפחה</Label>
                <Input
                  id="reg-last_name"
                  dir="rtl"
                  autoComplete="family-name"
                  aria-invalid={!!errors.last_name}
                  {...register("last_name")}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-military_id">מספר אישי</Label>
                <Input
                  id="reg-military_id"
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="7 ספרות"
                  aria-invalid={!!errors.military_id}
                  {...register("military_id")}
                />
                {errors.military_id && (
                  <p className="text-sm text-destructive">{errors.military_id.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-phone">טלפון</Label>
                <Input
                  id="reg-phone"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="05XXXXXXXX"
                  aria-invalid={!!errors.phone}
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-rank">דרגה</Label>
                <Controller
                  name="rank"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? null}
                      onValueChange={(v) => field.onChange(v ?? undefined)}
                    >
                      <SelectTrigger
                        id="reg-rank"
                        size="default"
                        className="h-10 w-full min-w-0 justify-between md:h-9"
                        aria-invalid={!!errors.rank}
                      >
                        <SelectValue placeholder="בחר דרגה" />
                      </SelectTrigger>
                      <SelectContent>
                        {IDF_RANKS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.rank && (
                  <p className="text-sm text-destructive">{errors.rank.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-role_description">תפקיד (לא משימתי)</Label>
                <Input
                  id="reg-role_description"
                  dir="rtl"
                  list="reg-military-role-suggestions"
                  placeholder="למשל: לוחם, מפק״צ…"
                  aria-invalid={!!errors.role_description}
                  {...register("role_description")}
                />
                <datalist id="reg-military-role-suggestions">
                  {MILITARY_ROLE_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                {errors.role_description && (
                  <p className="text-sm text-destructive">
                    {errors.role_description.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            חזרה לדף הבית
          </Link>
          <Button type="submit" disabled={isSubmitting} className="min-w-28">
            {isSubmitting ? "נרשם…" : "הרשמה"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
