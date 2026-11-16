import { redirect } from "next/navigation";
import { InviteCodeCard } from "@/components/admin/invite-code-card";
import { MembersTable, type Member } from "@/components/admin/members-table";
import { getCurrentProfile } from "@/lib/auth";
import { canManageTeam } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Department } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentProfile();
  if (!user || !canManageTeam(user)) redirect("/");

  const supabase = await createClient();
  const [{ data: settings }, { data: members }, { data: departments }] = await Promise.all([
    supabase.from("app_settings").select("invite_code").eq("id", 1).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name, department_id, is_admin, is_active")
      .order("is_active", { ascending: false })
      .order("full_name"),
    supabase.from("departments").select("id, name, slug").order("name"),
  ]);

  return (
    <div className="mx-auto grid max-w-4xl gap-8 px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
      <InviteCodeCard code={settings?.invite_code ?? ""} />
      <MembersTable
        members={(members ?? []) as Member[]}
        departments={(departments ?? []) as Department[]}
        currentUserId={user.id}
      />
    </div>
  );
}
