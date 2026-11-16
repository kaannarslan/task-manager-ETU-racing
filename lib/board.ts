// Pure helpers for the kanban board.

import { sortByDeadline } from "@/lib/permissions";
import { STATUSES, type TaskStatus } from "@/lib/types";

type BoardTask = { status: TaskStatus; deadline: string | null };

const DONE_WINDOW_DAYS = 30;

export function groupTasksByStatus<T extends BoardTask>(tasks: T[]): Record<TaskStatus, T[]> {
  const groups = Object.fromEntries(STATUSES.map((s) => [s, [] as T[]])) as Record<TaskStatus, T[]>;
  for (const task of tasks) groups[task.status].push(task);
  for (const status of STATUSES) groups[status] = sortByDeadline(groups[status]);
  return groups;
}

// `today` is a local date as YYYY-MM-DD, the same format as tasks.deadline.
export function isOverdue(task: BoardTask, today: string): boolean {
  if (task.status === "done" || task.deadline === null) return false;
  return task.deadline < today;
}

// Done tasks completed before this instant are hidden from the board.
export function doneCutoffIso(now: Date): string {
  return new Date(now.getTime() - DONE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// The team works in Turkey; the server runs in UTC. Computing "today" on the
// server in Istanbul time keeps overdue badges correct and identical between
// server render and hydration.
export function todayInIstanbul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}

const deadlineFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

// tasks.deadline is a plain date (YYYY-MM-DD); format it without shifting days.
export function formatDeadline(deadline: string): string {
  return deadlineFormat.format(new Date(`${deadline}T00:00:00Z`));
}
