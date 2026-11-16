import { describe, expect, test } from "vitest";
import { buildAttachmentPath, isAttachmentPathForTask } from "@/lib/storage-path";

const TASK = "3f2c1b7e-0000-4000-8000-000000000001";
const OTHER = "3f2c1b7e-0000-4000-8000-000000000002";

describe("buildAttachmentPath", () => {
  test("puts the file under the task's folder with a timestamp prefix", () => {
    expect(buildAttachmentPath(TASK, "rapor.pdf", 1700000000000)).toBe(
      `${TASK}/1700000000000-rapor.pdf`,
    );
  });

  test("replaces Turkish letters and spaces with storage-safe characters", () => {
    expect(buildAttachmentPath(TASK, "Şasi çizimi ığü.pdf", 1)).toBe(
      `${TASK}/1-Sasi_cizimi_igu.pdf`,
    );
  });

  test("falls back to a default name when nothing safe remains", () => {
    expect(buildAttachmentPath(TASK, "???", 1)).toBe(`${TASK}/1-dosya`);
  });
});

describe("isAttachmentPathForTask", () => {
  test("accepts a path built for the same task", () => {
    expect(isAttachmentPathForTask(TASK, buildAttachmentPath(TASK, "a.png", 1))).toBe(true);
  });

  test("rejects a path in another task's folder", () => {
    expect(isAttachmentPathForTask(TASK, `${OTHER}/1-a.png`)).toBe(false);
  });

  test("rejects nested folders and traversal", () => {
    expect(isAttachmentPathForTask(TASK, `${TASK}/../${OTHER}/1-a.png`)).toBe(false);
    expect(isAttachmentPathForTask(TASK, `${TASK}/x/1-a.png`)).toBe(false);
  });
});
