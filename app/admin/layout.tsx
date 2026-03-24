import { redirect } from "next/navigation";

import { getCurrentProfile, getSessionUser, isProfileComplete } from "@/lib/auth/profile";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  const profile = await getCurrentProfile();
  if (!isProfileComplete(profile)) {
    redirect("/setup-profile");
  }

  if (!profile?.is_admin) {
    redirect("/shabtzak");
  }

  return <div dir="rtl">{children}</div>;
}
