import { describe, expect, test } from "vitest";
import { validateFileSize, validateUrl } from "@/lib/validation";

const FIVE_MB = 5 * 1024 * 1024;

describe("validateFileSize", () => {
  test("accepts a file of exactly 5 MB", () => {
    expect(validateFileSize(FIVE_MB)).toBeNull();
  });

  test("rejects a file one byte over 5 MB with a Turkish error", () => {
    expect(validateFileSize(FIVE_MB + 1)).toBe(
      "Dosya boyutu 5 MB'ı geçemez.",
    );
  });

  test("rejects an empty file", () => {
    expect(validateFileSize(0)).toBe("Dosya boş.");
  });
});

describe("validateUrl", () => {
  test("accepts an https URL", () => {
    expect(validateUrl("https://drive.google.com/file/d/abc")).toBeNull();
  });

  test("accepts an http URL", () => {
    expect(validateUrl("http://example.com")).toBeNull();
  });

  test("rejects a javascript: URL", () => {
    expect(validateUrl("javascript:alert(1)")).toBe(
      "Geçerli bir bağlantı girin (http:// veya https://).",
    );
  });

  test("rejects garbage text", () => {
    expect(validateUrl("not a url")).toBe(
      "Geçerli bir bağlantı girin (http:// veya https://).",
    );
  });
});
