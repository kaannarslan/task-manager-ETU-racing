import { redirect } from "next/navigation";
import { MyTasksList, type MyTask } from "@/components/my-tasks-list";
import { getCurrentProfile } from "@/lib/auth";
import { doneCutoffIso, todayInIstanbul } from "@/lib/board";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const user = await getCurrentProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // Everything assigned to me across departments: open tasks, plus done
  // tasks completed in the last 30 days (same window as the boards).
  const [{ data: tasks }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, description, department_id, assignee_id, status, deadline, completed_at, created_by, assignee:profiles!assignee_id(id, full_name), attachments(id, task_id, kind, url, display_name), department:departments(name, slug)",
      )
      .eq("assignee_id", user.id)
      .or(`status.neq.done,completed_at.gt."${doneCutoffIso(new Date())}"`),
    supabase
      .from("profiles")
      .select("id, full_name, department_id, is_admin, is_active")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-5 text-xl font-semibold tracking-tight">Görevlerim</h1>
      <MyTasksList
        tasks={(tasks ?? []) as unknown as MyTask[]}
        profiles={(profiles ?? []) as Profile[]}
        currentUser={user}
        today={todayInIstanbul()}
      />
    </div>
  );
}
