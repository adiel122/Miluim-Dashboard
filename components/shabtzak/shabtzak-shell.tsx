"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/src/utils/supabase/client";

import { MyShiftsTab } from "./my-shifts-tab";
import { ShiftBoardTab } from "./shift-board-tab";

type ShabtzakShellProps = {
  isLoggedIn: boolean;
  isAdmin: boolean;
};

export function ShabtzakShell({ isLoggedIn, isAdmin }: ShabtzakShellProps) {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-lg font-semibold">שבצ״ק</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              דף הבית
            </Link>
            {isLoggedIn ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    ניהול
                  </Link>
                )}
                <Button variant="ghost" size="sm" type="button" onClick={() => void signOut()}>
                  יציאה
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login?next=/shabtzak"
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  התחבר
                </Link>
                <Link href="/register" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  הרשמה
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <Tabs defaultValue="board" className="w-full min-w-0">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1">
            <TabsTrigger value="board" className="text-xs sm:text-sm">
              שבצ״ק
            </TabsTrigger>
            <TabsTrigger value="mine" className="text-xs sm:text-sm">
              המשמרות שלי
            </TabsTrigger>
          </TabsList>
          <TabsContent value="board" className="mt-6 w-full min-w-0">
            <ShiftBoardTab />
          </TabsContent>
          <TabsContent value="mine" className="mt-6 w-full min-w-0">
            {isLoggedIn ? (
              <MyShiftsTab />
            ) : (
              <div className="space-y-4 py-10 text-center">
                <p className="text-muted-foreground">
                  התחבר כדי לראות משמרות ששובצת אליהן.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/login?next=/shabtzak"
                    className={buttonVariants({ variant: "default", size: "sm" })}
                  >
                    התחבר
                  </Link>
                  <Link
                    href="/register"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    הרשמה
                  </Link>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
