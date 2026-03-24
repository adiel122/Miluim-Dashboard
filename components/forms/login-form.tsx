"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { formatAuthFlowError } from "@/lib/supabase/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/src/utils/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/shabtzak";
  const inactiveReason = searchParams.get("reason") === "inactive";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signInEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(formatAuthFlowError(error));
      return;
    }
    router.refresh();
    router.push(nextPath);
  };

  return (
    <Card className="w-full max-w-md border-border/80 shadow-sm">
      <CardHeader className="text-right">
        <CardTitle className="text-xl">התחברות</CardTitle>
        <CardDescription>אימייל וסיסמה — אחרי ההתחברות נעבור ליעד הבא.</CardDescription>
      </CardHeader>
      <form method="post" onSubmit={signInEmail}>
        <CardContent className="grid gap-5 text-right">
          {inactiveReason && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              החשבון הושבת. פנה למנהל המערכת להפעלה מחדש.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-email">מייל</Label>
            <Input
              id="login-email"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-password">סיסמה</Label>
            <Input
              id="login-password"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "מתחבר…" : "התחבר"}
          </Button>
        </CardContent>
      </form>
      <CardFooter className="flex flex-col gap-2 border-t border-border/60 pt-4 text-right text-sm">
        <Link href="/register" className="text-primary underline-offset-4 hover:underline">
          אין חשבון? הרשמה
        </Link>
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          דף הבית
        </Link>
      </CardFooter>
    </Card>
  );
}
