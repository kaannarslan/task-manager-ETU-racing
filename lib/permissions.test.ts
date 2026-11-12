import { describe, expect, test } from "vitest";
import {
  canDeleteTask,
  canEditTask,
  canManageTeam,
  sortByDeadline,
} from "@/lib/permissions";
import type { Profile } from "@/lib/types";

const DEPT_A = "11111111-1111-1111-1111-111111111111";
const DEPT_B = "22222222-2222-2222-2222-222222222222";

function member(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    full_name: "Test Üye",
    department_id: DEPT_A,
    is_admin: false,
    is_active: true,
    ...overrides,
  };
}

describe("canEditTask", () => {
  test("admin can edit any task", () => {
    const admin = member({ is_admin: true, department_id: DEPT_B });
    expect(
      canEditTask(admin, { department_id: DEPT_A, assignee_id: null }),
    ).toBe(true);
  });

  test("member can edit a task on their own department's board", () => {
    expect(
      canEditTask(member(), { department_id: DEPT_A, assignee_id: "other" }),
    ).toBe(true);
  });

  test("member can edit a task assigned to them in another department", () => {
    expect(
      canEditTask(member(), { department_id: DEPT_B, assignee_id: "user-1" }),
    ).toBe(true);
  });

  test("member cannot edit another department's task not assigned to them", () => {
    expect(
      canEditTask(member(), { department_id: DEPT_B, assignee_id: "other" }),
    ).toBe(false);
  });

  test("unassigned task is editable by its department's members", () => {
    expect(
      canEditTask(member(), { department_id: DEPT_A, assignee_id: null }),
    ).toBe(true);
  });

  test("unassigned task is not editable by other departments' members", () => {
    expect(
      canEditTask(member(), { department_id: DEPT_B, assignee_id: null }),
    ).toBe(false);
  });

  test("inactive user can edit nothing, even as assignee or admin", () => {
    const inactive = member({ is_active: false, is_admin: true });
    expect(
      canEditTask(inactive, { department_id: DEPT_A, assignee_id: "user-1" }),
    ).toBe(false);
  });
});

describe("canDeleteTask / canManageTeam", () => {
  test("only active admins can delete tasks", () => {
    expect(canDeleteTask(member({ is_admin: true }))).toBe(true);
    expect(canDeleteTask(member())).toBe(false);
    expect(canDeleteTask(member({ is_admin: true, is_active: false }))).toBe(
      false,
    );
  });

  test("only active admins can manage the team", () => {
    expect(canManageTeam(member({ is_admin: true }))).toBe(true);
    expect(canManageTeam(member())).toBe(false);
    expect(canManageTeam(member({ is_admin: true, is_active: false }))).toBe(
      false,
    );
  });
});

describe("sortByDeadline", () => {
  test("sorts ascending with null deadlines last, keeping stable order", () => {
    const tasks = [
      { id: "no-deadline-1", deadline: null },
      { id: "late", deadline: "2027-03-01" },
      { id: "no-deadline-2", deadline: null },
      { id: "early", deadline: "2026-12-01" },
    ];
    expect(sortByDeadline(tasks).map((t) => t.id)).toEqual([
      "early",
      "late",
      "no-deadline-1",
      "no-deadline-2",
    ]);
  });

  test("does not mutate the input array", () => {
    const tasks = [
      { id: "b", deadline: "2027-01-01" },
      { id: "a", deadline: "2026-01-01" },
    ];
    sortByDeadline(tasks);
    expect(tasks[0].id).toBe("b");
  });
});
