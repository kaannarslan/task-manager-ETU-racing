import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Returns the signed-in member's profile, or null for anonymous users.
// Deactivated members are signed out and treated as anonymous: RLS hides
// their own profile row once is_active is false, so a missing row and a
// deactivated one are handled the same way.
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, department_id, is_admin, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return null;
  }
  return profile;
}
