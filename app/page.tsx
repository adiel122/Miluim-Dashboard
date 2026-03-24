import Link from "next/link";

import { ListingSubmissionForm } from "@/components/forms/listing-submission-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="text-right">
            <p className="text-lg font-semibold tracking-tight">מילואים סיפוח</p>
            <p className="text-sm text-muted-foreground">
              לוח מודעות למילואימניקים וליחידות
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              בית
            </Link>
            <Link
              href="/admin"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              ניהול
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
        <section className="text-right">
          <h1 className="text-balance text-3xl font-semibold sm:text-4xl">
            מצאו יחידה או מילואימניק מתאים
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-muted-foreground sm:text-lg">
            כאן יוצגו מודעות מאושרות, חיפוש וסינון לפי מקצוע, מיקום ודרגה — בשלב הבא.
            להלן טופס הגדרה עם אימות Zod לפרופיל ולמודעה.
          </p>
        </section>

        <section className="flex justify-center sm:justify-end">
          <ListingSubmissionForm />
        </section>
      </main>
    </div>
  );
}
