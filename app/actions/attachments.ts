"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { canEditTask } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Task } from "@/lib/types";
import { isAttachmentPathForTask } from "@/lib/storage-path";
import { validateUrl } from "@/lib/validation";

const BUCKET = "attachments";
const NO_SESSION = "Oturum bulunamadı.";
const NO_EDIT = "Bu görevi düzenleme yetkiniz yok.";
const NOT_FOUND = "Görev bulunamadı.";
const SAVE_FAILED = "Ek kaydedilemedi. Lütfen tekrar deneyin.";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function revalidateTaskPages() {
  revalidatePath("/board/[slug]", "page");
  revalidatePath("/my-tasks");
}

// Shared gate: signed in, task exists, and the user may edit it.
async function authorize(
  supabase: Supabase,
  taskId: string,
): Promise<{ userId: string } | { error: string }> {
  const user = await getCurrentProfile();
  if (!user) return { error: NO_SESSION };

  const { data: task } = await supabase
    .from("tasks")
    .select("department_id, assignee_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: NOT_FOUND };
  if (!canEditTask(user, task as Pick<Task, "department_id" | "assignee_id">)) {
    return { error: NO_EDIT };
  }
  return { userId: user.id };
}

// The browser uploads the file straight to Storage (Vercel caps function
// request bodies at 4.5 MB, below our 5 MB limit; the bucket enforces the
// 5 MB cap and the storage policies enforce edit rights). This action then
// records the uploaded object as an attachment.
export async function addFileAttachment(
  taskId: string,
  input: { path: string; display_name: string },
): Promise<ActionResult> {
  const path = String(input.path ?? "");
  if (!isAttachmentPathForTask(taskId, path)) {
    return { ok: false, error: "Geçersiz dosya yolu." };
  }
  const displayName = String(input.display_name ?? "").trim() || path.split("/")[1];

  const supabase = await createClient();
  const auth = await authorize(supabase, taskId);
  if ("error" in auth) return { ok: false, error: auth.error };

  const { error } = await supabase.from("attachments").insert({
    task_id: taskId,
    kind: "file",
    url: path,
    display_name: displayName,
    created_by: auth.userId,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidateTaskPages();
  return { ok: true };
}

export async function addLinkAttachment(
  taskId: string,
  input: { url: string; display_name: string },
): Promise<ActionResult> {
  const url = String(input.url ?? "").trim();
  const urlError = validateUrl(url);
  if (urlError) return { ok: false, error: urlError };
  const displayName = String(input.display_name ?? "").trim() || url;

  const supabase = await createClient();
  const auth = await authorize(supabase, taskId);
  if ("error" in auth) return { ok: false, error: auth.error };

  const { error } = await supabase.from("attachments").insert({
    task_id: taskId,
    kind: "link",
    url,
    display_name: displayName,
    created_by: auth.userId,
  });
  if (error) return { ok: false, error: SAVE_FAILED };

  revalidateTaskPages();
  return { ok: true };
}

export async function removeAttachment(attachmentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: attachment } = await supabase
    .from("attachments")
    .select("task_id, kind, url")
    .eq("id", attachmentId)
    .maybeSingle();
  if (!attachment) {
    // Distinguish "not signed in" from "no such attachment".
    const user = await getCurrentProfile();
    return { ok: false, error: user ? "Ek bulunamadı." : NO_SESSION };
  }

  const auth = await authorize(supabase, attachment.task_id);
  if ("error" in auth) return { ok: false, error: auth.error };

  const { data, error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Ek silinemedi." };

  // Same folder check as on insert: never delete outside this task's folder.
  if (attachment.kind === "file" && isAttachmentPathForTask(attachment.task_id, attachment.url)) {
    await supabase.storage.from(BUCKET).remove([attachment.url]);
  }

  revalidateTaskPages();
  return { ok: true };
}
