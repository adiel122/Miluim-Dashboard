import { ShabtzakShell } from "@/components/shabtzak/shabtzak-shell";
import { getCurrentProfile } from "@/lib/auth/profile";

export default async function ShabtzakPage() {
  const profile = await getCurrentProfile();
  return <ShabtzakShell isAdmin={profile?.is_admin ?? false} />;
}
