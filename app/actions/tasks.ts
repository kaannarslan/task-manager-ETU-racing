"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { canDeleteTask, canEditTask } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { isAttachmentPathForTask } from "@/lib/storage-path";
import { STATUSES, type ActionResult, type Task, type TaskStatus } from "@/lib/types";

const NO_SESSION = "Oturum bulunamadı.";
const NO_EDIT = "Bu görevi düzenleme yetkiniz yok.";
const NO_DELETE = "Silme yetkisi yalnız adminlerde.";
const NOT_FOUND = "Görev bulunamadı.";
const SAVE_FAILED = "Görev kaydedilemedi. Lütfen tekrar deneyin.";

type TaskPatch = Partial<
  Pick<Task, "title" | "description" | "assignee_id" | "deadline" | "status">
>;

function revalidateTaskPages() {
  revalidatePath("/board/[slug]", "page");
  revalidatePath("/my-tasks");
}

function isValidDeadline(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

// Server actions receive client-controlled input: keep only the editable
// fields and check each one, so nothing else can be written.
function cleanPatch(patch: TaskPatch): TaskPatch | string {
  const clean: TaskPatch = {};
  if (patch.title !== undefined) {
    const title = String(patch.title).trim();
    if (!title) return "Başlık boş olamaz.";
    clean.title = title;
  }
  if (patch.description !== undefined) {
    const description = patch.description === null ? "" : String(patch.description).trim();
    clean.description = description || null;
  }
  if (patch.assignee_id !== undefined) {
    clean.assignee_id = patch.assignee_id || null;
  }
  if (patch.deadline !== undefined) {
    const deadline = patch.deadline || null;
    if (deadline !== null && !isValidDeadline(deadline)) return "Geçersiz tarih.";
    clean.deadline = deadline;
  }
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status)) return "Geçersiz durum.";
    clean.status = patch.status;
  }
  return clean;
}

async function fetchTaskScope(supabase: Awaited<ReturnType<typeof createClient>>, taskId: string) {
  const { data } = await supabase
    .from("tasks")
    .select("id, department_id, assignee_id")
    .eq("id", taskId)
    .maybeSingle();
  return data as Pick<Task, "id" | "department_id" | "assignee_id"> | null;
}

export async function createTask(input: {
  title: string;
  description?: string;
  department_id: string;
  assignee_id?: string | null;
  deadline?: string | null;
}): Promise<ActionResult> {
  const user = await getCurrentProfile();
  if (!user) return { ok: false, error: NO_SESSION };

  if (!input.department_id) return { ok: false, error: "Departman seçin." };
  const fields = cleanPatch({
    title: input.title ?? "",
    description: input.description ?? null,
    assignee_id: input.assignee_id ?? null,
    deadline: input.deadline ?? null,
  });
  if (typeof fields === "string") return { ok: false, error: fields };

  // Any active member may create a task on any board (spec decision).
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    ...fields,
    department_id: input.department_id,
    created_by: user.id,
  });
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidateTaskPages();
  return { ok: true };
}

export async function updateTask(taskId: string, patch: TaskPatch): Promise<ActionResult> {
  const user = await getCurrentProfile();
  if (!user) return { ok: false, error: NO_SESSION };

  const fields = cleanPatch(patch);
  if (typeof fields === "string") return { ok: false, error: fields };

  const supabase = await createClient();
  const task = await fetchTaskScope(supabase, taskId);
  if (!task) return { ok: false, error: NOT_FOUND };
  if (!canEditTask(user, task)) return { ok: false, error: NO_EDIT };

  // .select() makes an RLS-blocked update visible: it returns no rows
  // instead of an error.
  const { data, error } = await supabase
    .from("tasks")
    .update(fields)
    .eq("id", taskId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: SAVE_FAILED };

  revalidateTaskPages();
  return { ok: true };
}

export async function moveTask(taskId: string, status: TaskStatus): Promise<ActionResult> {
  return updateTask(taskId, { status });
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const user = await getCurrentProfile();
  if (!user) return { ok: false, error: NO_SESSION };
  if (!canDeleteTask(user)) return { ok: false, error: NO_DELETE };

  const supabase = await createClient();

  // Remove stored files first; the attachment rows go with the task
  // (on delete cascade), but storage objects would otherwise be orphaned.
  const { data: files } = await supabase
    .from("attachments")
    .select("url")
    .eq("task_id", taskId)
    .eq("kind", "file");
  // Only paths inside this task's folder: a forged attachment row must not
  // make an admin's delete remove another task's files.
  const paths = (files ?? []).map((f) => f.url).filter((url) => isAttachmentPathForTask(taskId, url));
  if (paths.length) {
    await supabase.storage.from("attachments").remove(paths);
  }

  const { data, error } = await supabase.from("tasks").delete().eq("id", taskId).select("id");
  if (error) return { ok: false, error: SAVE_FAILED };
  if (!data?.length) return { ok: false, error: NOT_FOUND };

  revalidateTaskPages();
  return { ok: true };
}
