import { redirect } from "next/navigation";

import { SetupProfileForm } from "@/components/forms/setup-profile-form";
import { getCurrentProfile, getSessionUser, isProfileComplete } from "@/lib/auth/profile";

export default async function SetupProfilePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/setup-profile");
  }

  const profile = await getCurrentProfile();
  if (isProfileComplete(profile)) {
    redirect("/shabtzak");
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-xl flex-col items-stretch gap-6">
        <div className="text-right">
          <h1 className="text-2xl font-semibold">השלמת פרופיל</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            נדרשים פרטים מלאים לפני גישה לשבצ״ק.
          </p>
        </div>
        <SetupProfileForm />
      </div>
    </div>
  );
}
