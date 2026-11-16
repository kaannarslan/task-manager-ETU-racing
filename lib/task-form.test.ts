import { describe, expect, test } from "vitest";
import { buildTaskPatch, type TaskFormValues } from "@/lib/task-form";

const original = {
  title: "Şasi çizimi",
  description: null,
  assignee_id: "user-1",
  deadline: "2026-11-20",
  status: "todo" as const,
};

const unchanged: TaskFormValues = {
  title: "Şasi çizimi",
  description: "",
  assignee_id: "user-1",
  deadline: "2026-11-20",
  status: "todo",
};

describe("buildTaskPatch", () => {
  test("is empty when nothing changed (empty description equals null)", () => {
    expect(buildTaskPatch(original, unchanged)).toEqual({});
  });

  test("contains only the fields that changed", () => {
    expect(buildTaskPatch(original, { ...unchanged, title: "Şasi çizimi v2", status: "done" })).toEqual({
      title: "Şasi çizimi v2",
      status: "done",
    });
  });

  test("maps cleared assignee and deadline to null", () => {
    expect(buildTaskPatch(original, { ...unchanged, assignee_id: "", deadline: "" })).toEqual({
      assignee_id: null,
      deadline: null,
    });
  });

  test("ignores surrounding whitespace in the title", () => {
    expect(buildTaskPatch(original, { ...unchanged, title: "  Şasi çizimi " })).toEqual({});
  });
});
