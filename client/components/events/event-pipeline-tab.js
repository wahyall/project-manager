"use client";

import { useState, useCallback } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { LayoutTemplate, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventPipeline } from "@/hooks/use-event-pipeline";
import { useAuth } from "@/contexts/auth-context";
import { PipelinePhaseColumn } from "./pipeline-phase-column";
import { PipelineQuickCreateModal } from "./pipeline-quick-create-modal";
import { PipelineTemplateDialog } from "./pipeline-template-dialog";
import { TaskDetailPanel } from "@/components/kanban/task-detail-panel";

export function EventPipelineTab({ event, workspaceId, workspace, members }) {
  const { user } = useAuth();
  const {
    phases,
    labels,
    loading,
    activeTaskId,
    setActiveTaskId,
    activeTask,
    createTask,
    moveTaskPhase,
    updateTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    watchTask,
    unwatchTask,
    applyTemplate,
    saveAsTemplate,
  } = useEventPipeline(workspaceId, event._id);

  const [quickCreatePhase, setQuickCreatePhase] = useState(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0);

  // Wrap hook mutations with toasts, matching the pattern used on the
  // main Kanban page (client/app/workspace/[id]/tasks/kanban/page.js).
  const handleUpdateTask = useCallback(
    async (taskId, updates) => {
      try {
        await updateTask(taskId, updates);
      } catch {
        toast.error("Gagal mengupdate task");
      }
    },
    [updateTask],
  );
  const handleDeleteTask = useCallback(
    async (taskId) => {
      try {
        await deleteTask(taskId);
        toast.success("Task berhasil dihapus");
      } catch {
        toast.error("Gagal menghapus task");
      }
    },
    [deleteTask],
  );
  const handleArchiveTask = useCallback(
    async (taskId) => {
      try {
        await archiveTask(taskId);
        toast.success("Task berhasil diarsipkan");
      } catch {
        toast.error("Gagal mengarsipkan task");
      }
    },
    [archiveTask],
  );
  const handleUnarchiveTask = useCallback(
    async (taskId) => {
      try {
        await unarchiveTask(taskId);
        toast.success("Task berhasil diunarsipkan");
      } catch {
        toast.error("Gagal membatalkan arsip");
      }
    },
    [unarchiveTask],
  );
  const handleWatchTask = useCallback(
    async (taskId) => {
      try {
        await watchTask(taskId);
      } catch {
        toast.error("Gagal menjadi watcher");
      }
    },
    [watchTask],
  );
  const handleUnwatchTask = useCallback(
    async (taskId) => {
      try {
        await unwatchTask(taskId);
      } catch {
        toast.error("Gagal berhenti menjadi watcher");
      }
    },
    [unwatchTask],
  );

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    moveTaskPhase(draggableId, destination.droppableId);
  };

  if (loading) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-64 w-72 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
          <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
          {totalTasks === 0 ? "Terapkan Template" : "Kelola Template"}
        </Button>
        {totalTasks > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateDialogOpen("save")}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Simpan sebagai Template
          </Button>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {phases.map((p) => (
            <PipelinePhaseColumn
              key={p.phase}
              phase={p.phase}
              tasks={p.tasks}
              progress={p.progress}
              onQuickCreate={setQuickCreatePhase}
              onTaskClick={(task) => setActiveTaskId(task._id)}
            />
          ))}
        </div>
      </DragDropContext>

      <PipelineQuickCreateModal
        open={!!quickCreatePhase}
        onOpenChange={(open) => !open && setQuickCreatePhase(null)}
        phase={quickCreatePhase}
        onCreateTask={createTask}
      />

      <PipelineTemplateDialog
        open={!!templateDialogOpen}
        mode={templateDialogOpen === "save" ? "save" : "apply"}
        onOpenChange={(open) => !open && setTemplateDialogOpen(false)}
        workspaceId={workspaceId}
        onApplyTemplate={applyTemplate}
        onSaveAsTemplate={saveAsTemplate}
      />

      <TaskDetailPanel
        task={activeTask}
        open={!!activeTaskId}
        onClose={() => setActiveTaskId(null)}
        columns={workspace?.kanbanColumns || []}
        members={members}
        labels={labels}
        events={[event]}
        currentUserId={user?._id}
        workspaceId={workspaceId}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onArchive={handleArchiveTask}
        onUnarchive={handleUnarchiveTask}
        onWatch={handleWatchTask}
        onUnwatch={handleUnwatchTask}
      />
    </div>
  );
}
