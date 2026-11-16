"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "cn";
import { TaskCard } from "@/components/board/task-card";
import { STATUS_LABELS, type TaskStatus, type TaskWithAssignee } from "@/lib/types";

const STATUS_DOT: Record<TaskStatus, string> = {
  todo: "bg-zinc-400",
  in_progress: "bg-blue-500",
  blocked: "bg-amber-500",
  done: "bg-emerald-500",
};

export function Column({
  status,
  tasks,
  today,
  canDrag,
}: {
  status: TaskStatus;
  tasks: TaskWithAssignee[];
  today: string;
  canDrag: (task: TaskWithAssignee) => boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-40 flex-col rounded-xl border border-zinc-200 bg-zinc-50 p-2 transition-colors",
        isOver && "border-zinc-300 bg-zinc-100",
      )}
    >
      <header className="flex items-center gap-2 px-2 pb-2 pt-1">
        <span className={cn("size-2 rounded-full", STATUS_DOT[status])} aria-hidden />
        <h2 className="text-sm font-medium text-zinc-700">{STATUS_LABELS[status]}</h2>
        <span className="text-xs text-zinc-400">{tasks.length}</span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} today={today} draggable={canDrag(task)} />
        ))}
        {tasks.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-zinc-400">Görev yok</p>
        )}
      </div>
    </section>
  );
}
