import { createAdminClient } from "@/lib/supabase/admin";
import { RegisterForm } from "@/components/auth/register-form";
import type { Department } from "@/lib/types";

// Reads the database on every request, never at build time.
export const dynamic = "force-dynamic";

// Departments are read with the admin client: the visitor is anonymous at
// this point and RLS (correctly) hides every table from anonymous users.
export default async function RegisterPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("departments")
    .select("id, name, slug")
    .order("name");
  const departments: Department[] = data ?? [];

  return <RegisterForm departments={departments} />;
}
