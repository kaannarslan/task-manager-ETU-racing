"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { moveTask } from "@/app/actions/tasks";
import { Column } from "@/components/board/column";
import { TaskCardView } from "@/components/board/task-card";
import { groupTasksByStatus } from "@/lib/board";
import { canEditTask } from "@/lib/permissions";
import { STATUSES, type Profile, type TaskStatus, type TaskWithAssignee } from "@/lib/types";

export function Board({
  tasks,
  currentUser,
  today,
}: {
  tasks: TaskWithAssignee[];
  profiles: Profile[]; // used by the task dialog (Task 7)
  departmentId: string; // used by the task dialog (Task 7)
  currentUser: Profile;
  today: string; // YYYY-MM-DD, Istanbul time
}) {
  // The optimistic move lives only while the action runs; when it finishes,
  // either fresh server data (success) or the original list (failure) shows.
  const [optimisticTasks, applyMove] = useOptimistic(
    tasks,
    (state, move: { id: string; status: TaskStatus }) =>
      state.map((t) => (t.id === move.id ? { ...t, status: move.status } : t)),
  );
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    // A small distance keeps plain clicks free for opening the task.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const columns = groupTasksByStatus(optimisticTasks);
  const activeTask = optimisticTasks.find((t) => t.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const task = optimisticTasks.find((t) => t.id === event.active.id);
    const status = event.over?.id as TaskStatus | undefined;
    if (!task || !status || task.status === status) return;

    startTransition(async () => {
      applyMove({ id: task.id, status });
      const result = await moveTask(task.id, status);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={columns[status]}
            today={today}
            canDrag={(task) => canEditTask(currentUser, task)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCardView task={activeTask} today={today} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
