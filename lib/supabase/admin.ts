import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY client with the service-role (secret) key: bypasses RLS.
// Used only where an anonymous request legitimately needs privileged reads
// (signup invite-code check, department list on the register page).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
