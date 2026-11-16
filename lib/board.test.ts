import { describe, expect, test } from "vitest";
import { doneCutoffIso, formatDeadline, groupTasksByStatus, isOverdue, splitMyTasks, todayInIstanbul } from "@/lib/board";
import type { TaskStatus } from "@/lib/types";

function t(id: string, status: TaskStatus, deadline: string | null = null) {
  return { id, status, deadline };
}

describe("groupTasksByStatus", () => {
  test("returns all four columns even when some are empty", () => {
    const groups = groupTasksByStatus([t("a", "todo")]);
    expect(Object.keys(groups).sort()).toEqual(["blocked", "done", "in_progress", "todo"]);
    expect(groups.blocked).toEqual([]);
  });

  test("puts each task in its status column, sorted by deadline with nulls last", () => {
    const groups = groupTasksByStatus([
      t("none", "todo", null),
      t("late", "todo", "2026-12-10"),
      t("soon", "todo", "2026-11-20"),
      t("wip", "in_progress", "2026-11-01"),
    ]);
    expect(groups.todo.map((x) => x.id)).toEqual(["soon", "late", "none"]);
    expect(groups.in_progress.map((x) => x.id)).toEqual(["wip"]);
  });
});

describe("isOverdue", () => {
  test("is true for an open task whose deadline is before today", () => {
    expect(isOverdue(t("a", "todo", "2026-11-15"), "2026-11-16")).toBe(true);
  });

  test("is false on the deadline day itself", () => {
    expect(isOverdue(t("a", "todo", "2026-11-16"), "2026-11-16")).toBe(false);
  });

  test("is false for a task without a deadline", () => {
    expect(isOverdue(t("a", "blocked", null), "2026-11-16")).toBe(false);
  });

  test("is false for a done task even when its deadline passed", () => {
    expect(isOverdue(t("a", "done", "2026-01-01"), "2026-11-16")).toBe(false);
  });
});

describe("doneCutoffIso", () => {
  test("is exactly 30 days before now", () => {
    expect(doneCutoffIso(new Date("2026-11-16T12:00:00.000Z"))).toBe("2026-10-17T12:00:00.000Z");
  });
});

describe("todayInIstanbul", () => {
  test("uses the Istanbul calendar day, not UTC", () => {
    // 22:30 UTC on Nov 16 is already 01:30 on Nov 17 in Istanbul (UTC+3).
    expect(todayInIstanbul(new Date("2026-11-16T22:30:00Z"))).toBe("2026-11-17");
  });
});

describe("formatDeadline", () => {
  test("formats a date as a short Turkish day and month", () => {
    expect(formatDeadline("2026-11-05")).toBe("5 Kas");
  });
});

describe("splitMyTasks", () => {
  test("separates done tasks from open ones, each sorted by deadline with nulls last", () => {
    const { open, done } = splitMyTasks([
      t("open-none", "todo", null),
      t("done-late", "done", "2026-11-30"),
      t("open-late", "blocked", "2026-12-01"),
      t("open-soon", "in_progress", "2026-11-18"),
      t("done-soon", "done", "2026-11-01"),
    ]);
    expect(open.map((x) => x.id)).toEqual(["open-soon", "open-late", "open-none"]);
    expect(done.map((x) => x.id)).toEqual(["done-soon", "done-late"]);
  });
});
