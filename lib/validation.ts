// Input checks shared by the server actions. Each returns a Turkish error
// message for the UI, or null when the input is acceptable.

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // matches the storage bucket limit

export function validateFileSize(bytes: number): string | null {
  if (bytes <= 0) return "Dosya boş.";
  if (bytes > MAX_FILE_BYTES) return "Dosya boyutu 5 MB'ı geçemez.";
  return null;
}

export function validateUrl(url: string): string | null {
  const error = "Geçerli bir bağlantı girin (http:// veya https://).";
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return error;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return error;
  return null;
}
