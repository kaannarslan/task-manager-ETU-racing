// Shared domain types. These mirror supabase/migrations/0001_schema.sql.

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export interface Profile {
  id: string;
  full_name: string;
  department_id: string | null;
  is_admin: boolean;
  is_active: boolean;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  department_id: string;
  assignee_id: string | null;
  status: TaskStatus;
  deadline: string | null;
  completed_at: string | null;
  created_by: string | null;
}

export interface Attachment {
  id: string;
  task_id: string;
  kind: "file" | "link";
  url: string;
  display_name: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export const STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "done",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Yapılacak",
  in_progress: "Devam Ediyor",
  blocked: "Blokeli",
  done: "Tamamlandı",
};
