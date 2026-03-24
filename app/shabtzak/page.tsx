import { ShabtzakShell } from "@/components/shabtzak/shabtzak-shell";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";

export default async function ShabtzakPage() {
  const user = await getSessionUser();
  const profile = user ? await getCurrentProfile() : null;
  return (
    <ShabtzakShell
      isLoggedIn={!!user}
      isAdmin={profile?.is_admin ?? false}
    />
  );
}
