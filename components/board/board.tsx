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
import { NewTaskButton } from "@/components/board/new-task-button";
import { TaskCardView } from "@/components/board/task-card";
import { TaskDialog } from "@/components/board/task-dialog";
import { groupTasksByStatus } from "@/lib/board";
import { canEditTask } from "@/lib/permissions";
import {
  STATUSES,
  type Profile,
  type TaskStatus,
  type TaskWithAssignee,
} from "@/lib/types";

export function Board({
  tasks,
  profiles,
  departmentId,
  currentUser,
  today,
  heading,
}: {
  tasks: TaskWithAssignee[];
  profiles: Profile[];
  departmentId: string;
  currentUser: Profile;
  today: string; // YYYY-MM-DD, Istanbul time
  heading: React.ReactNode;
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
  // "new" = create mode, otherwise a task id. Kept after closing so the
  // dialog doesn't flash to create mode during its close animation.
  const [dialog, setDialog] = useState<string>("new");
  const [dialogOpenState, setDialogOpenState] = useState(false);
  // Bumped on every open so the form starts fresh each time.
  const [dialogSession, setDialogSession] = useState(0);
  const openDialog = (target: string) => {
    setDialog(target);
    setDialogSession((n) => n + 1);
    setDialogOpenState(true);
  };

  const sensors = useSensors(
    // A small distance keeps plain clicks free for opening the task.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const columns = groupTasksByStatus(optimisticTasks);
  const activeTask = optimisticTasks.find((t) => t.id === activeId) ?? null;
  // Read from the live list so the open dialog shows fresh data (e.g. new
  // attachments) after each action revalidates the page.
  const dialogTask =
    dialog !== "new"
      ? (tasks.find((t) => t.id === dialog) ?? null)
      : null;
  // A task deleted (or moved off this board) while open closes the dialog.
  const dialogOpen = dialogOpenState && (dialog === "new" || dialogTask !== null);

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
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        {heading}
        <NewTaskButton onClick={() => openDialog("new")} />
      </div>
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
              onOpen={(task) => openDialog(task.id)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <TaskCardView task={activeTask} today={today} dragging />
          ) : null}
        </DragOverlay>
      </DndContext>
      <TaskDialog
        key={dialogSession}
        open={dialogOpen}
        onOpenChange={setDialogOpenState}
        task={dialogTask}
        departmentId={departmentId}
        profiles={profiles}
        currentUser={currentUser}
      />
    </>
  );
}
