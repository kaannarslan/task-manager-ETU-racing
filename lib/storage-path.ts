// Storage paths for task attachments. Files live at "<taskId>/<name>" in
// the "attachments" bucket: the storage RLS policies derive write access
// from that first folder, so the layout is part of the security model.

// Storage keys reject many characters (spaces, Turkish letters); the
// original file name is kept in attachments.display_name instead.
function storageSafeName(name: string): string {
  const safe = name
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[_.]+|_+$/g, "");
  return safe.slice(-100) || "dosya";
}

export function buildAttachmentPath(taskId: string, fileName: string, now: number = Date.now()): string {
  return `${taskId}/${now}-${storageSafeName(fileName)}`;
}

export function isAttachmentPathForTask(taskId: string, path: string): boolean {
  const prefix = `${taskId}/`;
  if (!path.startsWith(prefix)) return false;
  const name = path.slice(prefix.length);
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.startsWith(".");
}
