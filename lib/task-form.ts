// Form <-> task mapping for the task dialog. Form inputs hold strings;
// an empty string means "no value" (null in the database).

import type { Task, TaskStatus } from "@/lib/types";

export type TaskFormValues = {
  title: string;
  description: string;
  assignee_id: string;
  deadline: string;
  status: TaskStatus;
};

type Editable = Pick<Task, "title" | "description" | "assignee_id" | "deadline" | "status">;

export function toFormValues(task: Editable): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    assignee_id: task.assignee_id ?? "",
    deadline: task.deadline ?? "",
    status: task.status,
  };
}

function normalize(values: TaskFormValues): Editable {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    assignee_id: values.assignee_id || null,
    deadline: values.deadline || null,
    status: values.status,
  };
}

// Only changed fields are sent, so saving the dialog never overwrites a
// field someone else changed meanwhile (e.g. a drag on another screen).
export function buildTaskPatch(original: Editable, values: TaskFormValues): Partial<Editable> {
  const next = normalize(values);
  const patch: Partial<Editable> = {};
  for (const key of Object.keys(next) as (keyof Editable)[]) {
    if (next[key] !== original[key]) Object.assign(patch, { [key]: next[key] });
  }
  return patch;
}
