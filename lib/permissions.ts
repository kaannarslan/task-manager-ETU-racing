// Authorization rules — the single source of truth used by all server
// actions. supabase/migrations/0002_rls.sql repeats these as a second lock.

import type { Profile, Task } from "@/lib/types";

type TaskScope = Pick<Task, "department_id" | "assignee_id">;

export function canEditTask(user: Profile, task: TaskScope): boolean {
  if (!user.is_active) return false;
  if (user.is_admin) return true;
  return (
    task.department_id === user.department_id || task.assignee_id === user.id
  );
}

export function canDeleteTask(user: Profile): boolean {
  return user.is_active && user.is_admin;
}

export function canManageTeam(user: Profile): boolean {
  return user.is_active && user.is_admin;
}

export function sortByDeadline<T extends { deadline: string | null }>(
  tasks: T[],
): T[] {
  return [...tasks].sort((a, b) => {
    if (a.deadline === null && b.deadline === null) return 0;
    if (a.deadline === null) return 1;
    if (b.deadline === null) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
}
