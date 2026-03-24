import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background px-4 py-12 text-center">
      <h1 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        שבצ״ק פלוגה א גדוד 794
      </h1>

      <nav className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/shabtzak"
          className={cn(buttonVariants({ size: "lg" }), "min-w-[10rem]")}
        >
          שבצ״ק
        </Link>
        <Link
          href="/admin"
          className={cn(
            buttonVariants({ variant: "secondary", size: "lg" }),
            "min-w-[10rem]"
          )}
        >
          ניהול
        </Link>
      </nav>
    </div>
  );
}
