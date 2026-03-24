"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/src/utils/supabase/client";

import { ConstraintsTab } from "./constraints-tab";
import { MyShiftsTab } from "./my-shifts-tab";
import { ShiftBoardTab } from "./shift-board-tab";

type ShabtzakShellProps = {
  isAdmin: boolean;
};

export function ShabtzakShell({ isAdmin }: ShabtzakShellProps) {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-lg font-semibold">שבצ״ק</h1>
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <Tabs defaultValue="board" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
            <TabsTrigger value="board" className="text-xs sm:text-sm">
              שבצ״ק
            </TabsTrigger>
            <TabsTrigger value="mine" className="text-xs sm:text-sm">
              המשמרות שלי
            </TabsTrigger>
            <TabsTrigger value="constraints" className="text-xs sm:text-sm">
              אילוצים
            </TabsTrigger>
          </TabsList>
          <TabsContent value="board" className="mt-6">
            <ShiftBoardTab />
          </TabsContent>
          <TabsContent value="mine" className="mt-6">
            <MyShiftsTab />
          </TabsContent>
          <TabsContent value="constraints" className="mt-6">
            <ConstraintsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
