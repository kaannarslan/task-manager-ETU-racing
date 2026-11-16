"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "cn";
import { CalendarIcon, GripVerticalIcon } from "lucide-react";
import { formatDeadline, isOverdue } from "@/lib/board";
import type { TaskWithAssignee } from "@/lib/types";

// Draggable wrapper; cards the user may not edit render without drag
// handles or listeners (the action rejects such moves as well).
export function TaskCard({
  task,
  today,
  draggable,
}: {
  task: TaskWithAssignee;
  today: string;
  draggable: boolean;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: task.id,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className={cn(isDragging && "opacity-40", draggable && "cursor-grab touch-none")}
    >
      <TaskCardView task={task} today={today} showHandle={draggable} />
    </div>
  );
}

export function TaskCardView({
  task,
  today,
  showHandle = false,
  dragging = false,
}: {
  task: TaskWithAssignee;
  today: string;
  showHandle?: boolean;
  dragging?: boolean;
}) {
  const overdue = isOverdue(task, today);

  return (
    <article
      className={cn(
        "group rounded-lg border border-zinc-200 bg-white p-3 shadow-xs transition-shadow hover:shadow-sm",
        dragging && "cursor-grabbing shadow-md",
      )}
    >
      <div className="flex items-start gap-1.5">
        <h3 className="flex-1 text-sm font-medium leading-snug text-zinc-900">{task.title}</h3>
        {(showHandle || dragging) && (
          <GripVerticalIcon className="mt-0.5 size-3.5 shrink-0 text-zinc-300 group-hover:text-zinc-400" aria-hidden />
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
        <span className={cn("truncate", task.assignee ? "text-zinc-600" : "text-zinc-400")}>
          {task.assignee?.full_name ?? "Atanmamış"}
        </span>
        {task.deadline && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5",
              overdue ? "bg-red-50 font-medium text-red-600" : "bg-zinc-100 text-zinc-600",
            )}
            title={overdue ? "Süresi geçti" : undefined}
          >
            <CalendarIcon className="size-3" aria-hidden />
            {formatDeadline(task.deadline)}
          </span>
        )}
      </div>
    </article>
  );
}
