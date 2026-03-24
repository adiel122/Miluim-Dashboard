import { Suspense } from "react";

import { LoginForm } from "@/components/forms/login-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";

function LoginFormFallback() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-border/80 p-8 text-center text-muted-foreground">
      טוען…
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12 text-right" dir="rtl">
      <div className="mx-auto flex max-w-lg flex-col items-stretch gap-6">
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
        <div className="text-center">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            חזרה
          </Link>
        </div>
      </div>
    </div>
  );
}
