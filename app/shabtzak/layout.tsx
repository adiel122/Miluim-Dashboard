import { redirect } from "next/navigation";

import { getCurrentProfile, getSessionUser, isProfileComplete } from "@/lib/auth/profile";

export default async function ShabtzakLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/shabtzak");
  }

  const profile = await getCurrentProfile();
  if (!isProfileComplete(profile)) {
    redirect("/setup-profile");
  }

  return <div dir="rtl">{children}</div>;
}
