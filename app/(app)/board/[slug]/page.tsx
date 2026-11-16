import { notFound, redirect } from "next/navigation";
import { Board } from "@/components/board/board";
import { getCurrentProfile } from "@/lib/auth";
import { doneCutoffIso, todayInIstanbul } from "@/lib/board";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TaskWithAssignee } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: PageProps<"/board/[slug]">) {
  const { slug } = await params;
  const user = await getCurrentProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: department } = await supabase
    .from("departments")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!department) notFound();

  // Open tasks, plus done tasks completed in the last 30 days.
  const [{ data: tasks }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, description, department_id, assignee_id, status, deadline, completed_at, created_by, assignee:profiles!assignee_id(id, full_name)",
      )
      .eq("department_id", department.id)
      .or(`status.neq.done,completed_at.gt."${doneCutoffIso(new Date())}"`),
    supabase
      .from("profiles")
      .select("id, full_name, department_id, is_admin, is_active")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-6">
      <h1 className="mb-5 text-xl font-semibold tracking-tight">{department.name}</h1>
      <Board
        tasks={(tasks ?? []) as unknown as TaskWithAssignee[]}
        profiles={(profiles ?? []) as Profile[]}
        departmentId={department.id}
        currentUser={user}
        today={todayInIstanbul()}
      />
    </div>
  );
}
