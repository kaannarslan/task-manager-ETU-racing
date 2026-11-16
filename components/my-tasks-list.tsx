"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "cn";
import { TaskDialog } from "@/components/board/task-dialog";
import { formatDeadline, isOverdue, splitMyTasks } from "@/lib/board";
import { STATUS_LABELS, type Profile, type TaskStatus, type TaskWithAssignee } from "@/lib/types";

export type MyTask = TaskWithAssignee & {
  department: { name: string; slug: string } | null;
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-zinc-100 text-zinc-700",
  in_progress: "bg-blue-50 text-blue-700",
  blocked: "bg-amber-50 text-amber-700",
  done: "bg-emerald-50 text-emerald-700",
};

export function MyTasksList({
  tasks,
  profiles,
  currentUser,
  today,
}: {
  tasks: MyTask[];
  profiles: Profile[];
  currentUser: Profile;
  today: string; // YYYY-MM-DD, Istanbul time
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);

  // Read from the live list so the dialog reflects saved changes; a task
  // reassigned away from me disappears and closes the dialog.
  const selected = tasks.find((t) => t.id === selectedId) ?? null;
  const { open: openTasks, done } = splitMyTasks(tasks);

  function openTask(id: string) {
    setSelectedId(id);
    setSession((n) => n + 1);
    setOpen(true);
  }

  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-12 text-center text-sm text-zinc-500">
        Sana atanmış görev yok. 🎉
      </p>
    );
  }

  return (
    <>
      <TaskRows tasks={openTasks} today={today} onOpen={openTask} />
      {done.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-medium text-zinc-500">Son 30 günde tamamlananlar</h2>
          <TaskRows tasks={done} today={today} onOpen={openTask} />
        </>
      )}
      {selected && (
        <TaskDialog
          key={session}
          open={open}
          onOpenChange={setOpen}
          task={selected}
          departmentId={selected.department_id}
          profiles={profiles}
          currentUser={currentUser}
        />
      )}
    </>
  );
}

function TaskRows({ tasks, today, onOpen }: { tasks: MyTask[]; today: string; onOpen: (id: string) => void }) {
  if (tasks.length === 0) {
    return <p className="px-1 text-sm text-zinc-500">Açık görev yok.</p>;
  }
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
      {tasks.map((task) => {
        const overdue = isOverdue(task, today);
        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onOpen(task.id)}
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 bg-white px-4 py-3 text-left outline-none hover:bg-zinc-50 focus-visible:bg-zinc-50"
            >
              <span
                className={cn(
                  "min-w-0 flex-1 basis-48 truncate text-sm font-medium",
                  task.status === "done" ? "text-zinc-500 line-through" : "text-zinc-900",
                )}
              >
                {task.title}
              </span>
              {task.department && (
                <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600">
                  {task.department.name}
                </span>
              )}
              <span className={cn("rounded px-1.5 py-0.5 text-xs", STATUS_STYLE[task.status])}>
                {STATUS_LABELS[task.status]}
              </span>
              <span
                className={cn(
                  "inline-flex w-20 items-center justify-end gap-1 text-xs",
                  overdue ? "font-medium text-red-600" : "text-zinc-500",
                )}
                title={overdue ? "Süresi geçti" : undefined}
              >
                {task.deadline ? (
                  <>
                    <CalendarIcon className="size-3" aria-hidden />
                    {formatDeadline(task.deadline)}
                  </>
                ) : (
                  <span className="text-zinc-400">Tarih yok</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
