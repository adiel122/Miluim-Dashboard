"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import { IDF_RANKS, MILITARY_ROLE_SUGGESTIONS } from "@/lib/constants/idf-ranks";
import {
  listingSubmissionSchema,
  type ListingSubmissionFormValues,
  type ListingSubmissionValues,
} from "@/lib/validations/listing-submission";

const defaultValues: Partial<ListingSubmissionFormValues> = {
  first_name: "",
  last_name: "",
  military_id: "",
  phone: "",
  title: "",
  description: "",
  rank_required: "",
  profession: "",
  location: "",
};

type ListingSubmissionFormProps = {
  /** Called after Zod validation with cleaned values; plug in Supabase here */
  onValidSubmit?: (data: ListingSubmissionValues) => void | Promise<void>;
};

export function ListingSubmissionForm({ onValidSubmit }: ListingSubmissionFormProps) {
  const form = useForm<ListingSubmissionFormValues>({
    resolver: zodResolver(listingSubmissionSchema),
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
    const data = raw as ListingSubmissionValues;
    try {
      await onValidSubmit?.(data);
      toast.success("הטופס נשלח בהצלחה (החיבור ל-Supabase — בפיתוח)");
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בשליחה");
    }
  });

  return (
    <Card className="w-full max-w-xl border-border/80 shadow-sm">
      <CardHeader className="text-right">
        <CardTitle className="text-xl">פרסום מודעה</CardTitle>
        <CardDescription>
          פרטי פרופיל ומודעה. לאחר האישור יופיעו בלוח.
        </CardDescription>
      </CardHeader>
      <form method="post" onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-5 text-right">
          <div
            role="group"
            aria-label="פרטים אישיים"
            className="grid gap-4 rounded-lg border border-border/60 bg-muted/20 p-4"
          >
            <p className="text-sm font-medium text-muted-foreground">פרטים אישיים</p>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="first_name">שם</Label>
                <Input
                  id="first_name"
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
                <Label htmlFor="last_name">שם משפחה</Label>
                <Input
                  id="last_name"
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
                <Label htmlFor="military_id">מספר אישי</Label>
                <Input
                  id="military_id"
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="7 ספרות"
                  aria-invalid={!!errors.military_id}
                  {...register("military_id")}
                />
                {errors.military_id && (
                  <p className="text-sm text-destructive">{errors.military_id.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">טלפון</Label>
                <Input
                  id="phone"
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
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
                <Label htmlFor="rank">דרגה</Label>
                <Controller
                  name="rank"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? null}
                      onValueChange={(v) => field.onChange(v ?? undefined)}
                      required={false}
                    >
                      <SelectTrigger
                        id="rank"
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
                <Label htmlFor="military_role">תפקיד (לא משימתי)</Label>
                <Input
                  id="military_role"
                  dir="rtl"
                  list="military-role-suggestions"
                  autoComplete="off"
                  placeholder="למשל: לוחם, מפק״צ, מודיעין…"
                  aria-invalid={!!errors.military_role}
                  {...register("military_role")}
                />
                <datalist id="military-role-suggestions">
                  {MILITARY_ROLE_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                {errors.military_role && (
                  <p className="text-sm text-destructive">
                    {errors.military_role.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div
            role="group"
            aria-label="המודעה"
            className="grid gap-4 rounded-lg border border-border/60 bg-muted/20 p-4"
          >
            <p className="text-sm font-medium text-muted-foreground">המודעה</p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">כותרת</Label>
              <Input
                id="title"
                dir="rtl"
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">תיאור (אופציונלי)</Label>
              <Textarea
                id="description"
                dir="rtl"
                rows={4}
                className="min-h-24 resize-y"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rank_required">דרגה נדרשת (במודעה)</Label>
                <Input
                  id="rank_required"
                  dir="rtl"
                  placeholder="למשל: סרן ומעלה"
                  aria-invalid={!!errors.rank_required}
                  {...register("rank_required")}
                />
                {errors.rank_required && (
                  <p className="text-sm text-destructive">
                    {errors.rank_required.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="profession">מקצוע / התמחות במודעה</Label>
                <Input
                  id="profession"
                  dir="rtl"
                  aria-invalid={!!errors.profession}
                  {...register("profession")}
                />
                {errors.profession && (
                  <p className="text-sm text-destructive">{errors.profession.message}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="location">מיקום</Label>
              <Input
                id="location"
                dir="rtl"
                aria-invalid={!!errors.location}
                {...register("location")}
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location.message}</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-start border-t border-border/60 pt-4">
          <Button type="submit" disabled={isSubmitting} className="min-w-28">
            {isSubmitting ? "שולח…" : "שלח לאישור"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
