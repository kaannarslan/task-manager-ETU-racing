"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ExternalLinkIcon, FileIcon, LinkIcon, PaperclipIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { addFileAttachment, addLinkAttachment, removeAttachment } from "@/app/actions/attachments";
import { createTask, deleteTask, updateTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { canDeleteTask, canEditTask } from "@/lib/permissions";
import { buildAttachmentPath } from "@/lib/storage-path";
import { createClient } from "@/lib/supabase/client";
import { buildTaskPatch, toFormValues, type TaskFormValues } from "@/lib/task-form";
import {
  STATUSES,
  STATUS_LABELS,
  type Attachment,
  type Profile,
  type TaskStatus,
  type TaskWithAssignee,
} from "@/lib/types";
import { validateFileSize, validateUrl } from "@/lib/validation";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

const EMPTY_FORM: TaskFormValues = {
  title: "",
  description: "",
  assignee_id: "",
  deadline: "",
  status: "todo",
};

// task === null opens the dialog in create mode on the current board.
export function TaskDialog({
  open,
  onOpenChange,
  task,
  departmentId,
  profiles,
  currentUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithAssignee | null;
  departmentId: string;
  profiles: Profile[];
  currentUser: Profile;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {/* key resets the form whenever another task is opened */}
        <TaskForm
          key={task?.id ?? "new"}
          task={task}
          departmentId={departmentId}
          profiles={profiles}
          currentUser={currentUser}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({
  task,
  departmentId,
  profiles,
  currentUser,
  onDone,
}: {
  task: TaskWithAssignee | null;
  departmentId: string;
  profiles: Profile[];
  currentUser: Profile;
  onDone: () => void;
}) {
  const [values, setValues] = useState<TaskFormValues>(task ? toFormValues(task) : EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editable = task === null || canEditTask(currentUser, task);
  const deletable = task !== null && canDeleteTask(currentUser);

  // A deactivated or removed assignee is not in the active list; keep them
  // selectable so opening the task doesn't silently change it.
  const assigneeOptions =
    task?.assignee && !profiles.some((p) => p.id === task.assignee!.id)
      ? [...profiles, { ...task.assignee }]
      : profiles;

  function set<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      let result;
      if (task === null) {
        result = await createTask({
          title: values.title,
          description: values.description,
          department_id: departmentId,
          assignee_id: values.assignee_id || null,
          deadline: values.deadline || null,
        });
        // No status field in create mode: new tasks start in "Yapılacak".
      } else {
        const patch = buildTaskPatch(task, values);
        if (Object.keys(patch).length === 0) return onDone();
        result = await updateTask(task.id, patch);
      }
      if (!result.ok) return setError(result.error);
      toast.success(task === null ? "Görev oluşturuldu." : "Görev kaydedildi.");
      onDone();
    });
  }

  function handleDelete() {
    if (!task || !window.confirm(`"${task.title}" görevi silinsin mi? Bu işlem geri alınamaz.`)) return;
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (!result.ok) return setError(result.error);
      toast.success("Görev silindi.");
      onDone();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{task === null ? "Yeni görev" : editable ? "Görevi düzenle" : task.title}</DialogTitle>
        {!editable && (
          <DialogDescription>Bu görevi yalnızca görüntüleyebilirsiniz.</DialogDescription>
        )}
      </DialogHeader>

      <form id="task-form" onSubmit={handleSubmit} className="grid gap-4">
        <fieldset disabled={!editable || pending} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Başlık</Label>
            <Input
              id="title"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              required
              autoFocus={editable}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              rows={4}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="assignee">Sorumlu</Label>
              <select
                id="assignee"
                className={selectClass}
                value={values.assignee_id}
                onChange={(e) => set("assignee_id", e.target.value)}
              >
                <option value="">Atanmamış</option>
                {assigneeOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deadline">Son tarih</Label>
              <div className="flex gap-1">
                <Input
                  id="deadline"
                  type="date"
                  value={values.deadline}
                  onChange={(e) => set("deadline", e.target.value)}
                />
                {values.deadline && editable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => set("deadline", "")}
                    aria-label="Tarihi temizle"
                  >
                    <XIcon />
                  </Button>
                )}
              </div>
            </div>
          </div>
          {task !== null && (
            <div className="grid gap-1.5">
              <Label htmlFor="status">Durum</Label>
              <select
                id="status"
                className={selectClass}
                value={values.status}
                onChange={(e) => set("status", e.target.value as TaskStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </form>

      {task !== null && <Attachments task={task} editable={editable} />}

      <DialogFooter className="items-center sm:justify-between">
        <div>
          {deletable && (
            <Button type="button" variant="ghost" className="text-destructive" onClick={handleDelete} disabled={pending}>
              <Trash2Icon />
              Sil
            </Button>
          )}
        </div>
        {editable && (
          <Button type="submit" form="task-form" disabled={pending}>
            {pending ? "Kaydediliyor…" : task === null ? "Oluştur" : "Kaydet"}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

function Attachments({ task, editable }: { task: TaskWithAssignee; editable: boolean }) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const files = task.attachments.filter((a) => a.kind === "file");
  const filePathsKey = files.map((f) => f.url).join("|");

  // Files live in a private bucket: fetch short-lived signed URLs for them.
  useEffect(() => {
    const paths = filePathsKey ? filePathsKey.split("|") : [];
    if (paths.length === 0) return;
    let cancelled = false;
    createClient()
      .storage.from("attachments")
      .createSignedUrls(paths, 60 * 60)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSignedUrls(
          Object.fromEntries(
            data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])),
          ),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [filePathsKey]);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const sizeError = validateFileSize(file.size);
    if (sizeError) return void toast.error(sizeError);

    startTransition(async () => {
      // Upload straight to Storage: Vercel caps function request bodies
      // below our 5 MB limit. Storage policies check edit rights.
      const path = buildAttachmentPath(task.id, file.name);
      const { error } = await createClient()
        .storage.from("attachments")
        .upload(path, file, { contentType: file.type || undefined });
      if (error) return void toast.error("Dosya yüklenemedi. Lütfen tekrar deneyin.");
      const result = await addFileAttachment(task.id, { path, display_name: file.name });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Dosya eklendi.");
    });
  }

  function handleAddLink(event: React.FormEvent) {
    event.preventDefault();
    const urlError = validateUrl(linkUrl);
    if (urlError) return void toast.error(urlError);
    startTransition(async () => {
      const result = await addLinkAttachment(task.id, { url: linkUrl, display_name: linkName });
      if (!result.ok) return void toast.error(result.error);
      setLinkUrl("");
      setLinkName("");
      setLinkOpen(false);
      toast.success("Bağlantı eklendi.");
    });
  }

  function handleRemove(attachment: Attachment) {
    if (!window.confirm(`"${attachment.display_name}" kaldırılsın mı?`)) return;
    startTransition(async () => {
      const result = await removeAttachment(attachment.id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Ek kaldırıldı.");
    });
  }

  return (
    <section className="grid gap-2 border-t border-zinc-200 pt-4">
      <h3 className="flex items-center gap-1.5 text-sm font-medium">
        <PaperclipIcon className="size-3.5" /> Ekler
      </h3>

      {task.attachments.length === 0 && <p className="text-xs text-zinc-500">Henüz ek yok.</p>}
      <ul className="grid gap-1">
        {task.attachments.map((a) => {
          const href = a.kind === "file" ? signedUrls[a.url] : a.url;
          const Icon = a.kind === "file" ? FileIcon : LinkIcon;
          return (
            <li key={a.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50">
              <Icon className="size-3.5 shrink-0 text-zinc-500" />
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-sm hover:underline"
                >
                  {a.display_name}
                </a>
              ) : (
                <span className="flex-1 truncate text-sm text-zinc-500">{a.display_name}</span>
              )}
              {a.kind === "link" && <ExternalLinkIcon className="size-3 shrink-0 text-zinc-400" />}
              {editable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleRemove(a)}
                  disabled={pending}
                  aria-label={`${a.display_name} ekini kaldır`}
                >
                  <XIcon />
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {editable && (
        <div className="grid gap-2">
          <div className="flex gap-2">
            <input ref={fileInput} type="file" className="hidden" onChange={handleFile} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={pending}>
              <FileIcon /> Dosya ekle
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setLinkOpen((o) => !o)} disabled={pending}>
              <LinkIcon /> Link ekle
            </Button>
            {pending && <span className="self-center text-xs text-zinc-500">İşleniyor…</span>}
          </div>
          <p className="text-xs text-zinc-500">Dosya boyutu en fazla 5 MB.</p>
          {linkOpen && (
            <form onSubmit={handleAddLink} className="grid gap-2 rounded-lg border border-zinc-200 p-2">
              <Input
                placeholder="https://drive.google.com/…"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                aria-label="Bağlantı adresi"
                required
              />
              <Input
                placeholder="Görünen ad (isteğe bağlı)"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                aria-label="Görünen ad"
              />
              <Button type="submit" size="sm" disabled={pending} className="justify-self-end">
                Ekle
              </Button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
