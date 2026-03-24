"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  profileCoreSchema,
  type ProfileCoreValues,
  type ProfileFormInput,
} from "@/lib/validations/profile";
import { createClient } from "@/src/utils/supabase/client";

export function SetupProfileForm() {
  const router = useRouter();
  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileCoreSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      military_id: "",
      phone: "",
      rank: undefined,
      role_description: "",
    },
    mode: "onTouched",
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (raw) => {
    const data = raw as ProfileCoreValues;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("יש להתחבר מחדש");
      router.push("/login?next=/setup-profile");
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        first_name: data.first_name,
        last_name: data.last_name,
        military_id: data.military_id,
        phone: data.phone,
        rank: data.rank,
        role_description: data.role_description,
      },
      { onConflict: "id" }
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("הפרופיל נשמר");
    router.refresh();
    router.push("/shabtzak");
  });

  return (
    <Card className="w-full max-w-xl border-border/80 shadow-sm">
      <CardHeader className="text-right">
        <CardTitle className="text-xl">השלמת פרופיל</CardTitle>
        <CardDescription>
          יש למלא פרטים לפני כניסה לשבצ״ק. הפרטים נשמרים בפרופיל המילואים.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4 text-right">
          <fieldset className="grid gap-3 rounded-lg border border-border/60 p-4">
            <legend className="text-sm font-medium text-muted-foreground">
              פרטים אישיים
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-2">
                <Label htmlFor="sp-first_name">שם</Label>
                <Input
                  id="sp-first_name"
                  dir="rtl"
                  aria-invalid={!!errors.first_name}
                  {...register("first_name")}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sp-last_name">שם משפחה</Label>
                <Input
                  id="sp-last_name"
                  dir="rtl"
                  aria-invalid={!!errors.last_name}
                  {...register("last_name")}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-2">
                <Label htmlFor="sp-military_id">מספר אישי</Label>
                <Input
                  id="sp-military_id"
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
              <div className="grid gap-2">
                <Label htmlFor="sp-phone">טלפון</Label>
                <Input
                  id="sp-phone"
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
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-2">
                <Label htmlFor="sp-rank">דרגה</Label>
                <Controller
                  name="rank"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? null}
                      onValueChange={(v) => field.onChange(v ?? undefined)}
                    >
                      <SelectTrigger id="sp-rank" className="h-9 w-full justify-between">
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
              <div className="grid gap-2">
                <Label htmlFor="sp-role_description">תפקיד (תיאור)</Label>
                <Input
                  id="sp-role_description"
                  dir="rtl"
                  list="sp-role-suggestions"
                  aria-invalid={!!errors.role_description}
                  {...register("role_description")}
                />
                <datalist id="sp-role-suggestions">
                  {MILITARY_ROLE_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                {errors.role_description && (
                  <p className="text-sm text-destructive">{errors.role_description.message}</p>
                )}
              </div>
            </div>
          </fieldset>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between gap-3 border-t border-border/60 pt-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            התנתקות — התחברות
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "שומר…" : "שמירה והמשך"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
