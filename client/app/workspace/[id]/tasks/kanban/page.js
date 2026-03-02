"use client";

import { use, useRef, useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/contexts/auth-context";
import { useKanban } from "@/hooks/use-kanban";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { FilterToolbar } from "@/components/kanban/filter-toolbar";
import { QuickCreateModal } from "@/components/kanban/quick-create-modal";
import { TaskDetailPanel } from "@/components/kanban/task-detail-panel";
import { BulkActionBar } from "@/components/kanban/bulk-action-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Columns3,
  Plus,
  RefreshCw,
  Keyboard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function KanbanPage({ params }) {
  const { id: workspaceId } = use(params);
  const { currentWorkspace, members, fetchMembers } = useWorkspace();
  const { user } = useAuth();

  // ── Kanban hook ──────────────────────────────────
  const kanban = useKanban(workspaceId, currentWorkspace);

  // ── Quick create modal state ─────────────────────
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateColumnId, setQuickCreateColumnId] = useState(null);

  // ── Search input ref (for keyboard shortcut) ─────
  const searchInputRef = useRef(null);

  // ── Fetch members on mount ───────────────────────
  useEffect(() => {
    if (workspaceId) {
      fetchMembers(workspaceId);
    }
  }, [workspaceId, fetchMembers]);

  // ── Quick create handler ─────────────────────────
  const handleQuickCreate = useCallback((columnId) => {
    setQuickCreateColumnId(columnId);
    setQuickCreateOpen(true);
  }, []);

  // ── Task click → open detail panel ───────────────
  const handleTaskClick = useCallback(
    (taskId) => {
      kanban.setActiveTaskId(taskId);
    },
    [kanban]
  );

  // ── Create task ──────────────────────────────────
  const handleCreateTask = useCallback(
    async (taskData) => {
      try {
        const task = await kanban.createTask(taskData);
        toast.success("Task berhasil dibuat");
        return task;
      } catch (err) {
        toast.error("Gagal membuat task");
        throw err;
      }
    },
    [kanban]
  );

  // ── Update task ──────────────────────────────────
  const handleUpdateTask = useCallback(
    async (taskId, updates) => {
      try {
        await kanban.updateTask(taskId, updates);
      } catch (err) {
        toast.error("Gagal mengupdate task");
        throw err;
      }
    },
    [kanban]
  );

  // ── Delete task ──────────────────────────────────
  const handleDeleteTask = useCallback(
    async (taskId) => {
      try {
        await kanban.deleteTask(taskId);
        toast.success("Task berhasil dihapus");
      } catch (err) {
        toast.error("Gagal menghapus task");
      }
    },
    [kanban]
  );

  // ── Archive/Unarchive task ───────────────────────
  const handleArchiveTask = useCallback(
    async (taskId) => {
      try {
        await kanban.archiveTask(taskId);
        toast.success("Task berhasil diarsipkan");
      } catch (err) {
        toast.error("Gagal mengarsipkan task");
      }
    },
    [kanban]
  );

  const handleUnarchiveTask = useCallback(
    async (taskId) => {
      try {
        await kanban.unarchiveTask(taskId);
        toast.success("Task berhasil diunarsipkan");
      } catch (err) {
        toast.error("Gagal membatalkan arsip");
      }
    },
    [kanban]
  );

  // ── Watch/Unwatch task ───────────────────────────
  const handleWatchTask = useCallback(
    async (taskId) => {
      try {
        await kanban.watchTask(taskId);
        toast.success("Kamu sekarang menjadi watcher");
      } catch (err) {
        toast.error("Gagal menjadi watcher");
      }
    },
    [kanban]
  );

  const handleUnwatchTask = useCallback(
    async (taskId) => {
      try {
        await kanban.unwatchTask(taskId);
        toast.success("Berhenti menjadi watcher");
      } catch (err) {
        toast.error("Gagal berhenti menjadi watcher");
      }
    },
    [kanban]
  );

  // ── Bulk action handlers ─────────────────────────
  const handleBulkMoveToColumn = useCallback(
    async (taskIds, columnId) => {
      try {
        await kanban.bulkMoveToColumn(taskIds, columnId);
        toast.success(`${taskIds.length} task dipindahkan`);
      } catch (err) {
        toast.error("Gagal memindahkan task");
      }
    },
    [kanban]
  );

  const handleBulkChangePriority = useCallback(
    async (taskIds, priority) => {
      try {
        await kanban.bulkUpdateField(taskIds, "priority", priority);
        toast.success(`Prioritas ${taskIds.length} task diperbarui`);
      } catch (err) {
        toast.error("Gagal mengubah prioritas");
      }
    },
    [kanban]
  );

  const handleBulkArchive = useCallback(
    async (taskIds) => {
      try {
        await kanban.bulkArchive(taskIds);
        toast.success(`${taskIds.length} task diarsipkan`);
      } catch (err) {
        toast.error("Gagal mengarsipkan task");
      }
    },
    [kanban]
  );

  const handleBulkDelete = useCallback(
    async (taskIds) => {
      try {
        await kanban.bulkDelete(taskIds);
        toast.success(`${taskIds.length} task dihapus`);
      } catch (err) {
        toast.error("Gagal menghapus task");
      }
    },
    [kanban]
  );

  // ── Keyboard shortcuts ───────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input/textarea
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.target.isContentEditable) return;

      switch (e.key) {
        case "n":
        case "N":
          e.preventDefault();
          setQuickCreateColumnId(kanban.columns[0]?._id || null);
          setQuickCreateOpen(true);
          break;
        case "f":
        case "F":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case "Escape":
          if (kanban.activeTaskId) {
            kanban.setActiveTaskId(null);
          } else if (kanban.selectedTaskIds.size > 0) {
            kanban.clearSelection();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [kanban]);

  // ── Early return if workspace not loaded ─────────
  if (!currentWorkspace) return null;

  const columns = kanban.columns;
  const totalTasks = kanban.allTasks.filter((t) => !t.isArchived).length;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Columns3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Kanban Board
              </h1>
              <p className="text-xs text-muted-foreground">
                {totalTasks} task aktif di {columns.length} kolom
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Keyboard shortcuts hint */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Keyboard className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                <p className="font-semibold mb-1">Keyboard Shortcuts</p>
                <p><kbd className="px-1 rounded bg-muted text-[10px]">N</kbd> Buat task baru</p>
                <p><kbd className="px-1 rounded bg-muted text-[10px]">F</kbd> Fokus pencarian</p>
                <p><kbd className="px-1 rounded bg-muted text-[10px]">Esc</kbd> Tutup panel</p>
              </TooltipContent>
            </Tooltip>

            {/* Refresh */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => kanban.fetchTasks()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>

            {/* New task button */}
            <Button
              className="gap-2 shadow-sm h-9"
              onClick={() => {
                setQuickCreateColumnId(columns[0]?._id || null);
                setQuickCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Task</span>
            </Button>
          </div>
        </div>

        {/* Filter toolbar */}
        <FilterToolbar
          filters={kanban.filters}
          setFilters={kanban.setFilters}
          activeFilterCount={kanban.activeFilterCount}
          members={members}
          labels={kanban.labels}
          searchInputRef={searchInputRef}
        />
      </div>

      <Separator />

      {/* Board area */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        {kanban.error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-destructive/60 mb-4" />
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Terjadi kesalahan
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {kanban.error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => kanban.fetchTasks()}
              >
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        ) : columns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 mb-6">
                <Columns3 className="h-10 w-10 text-emerald-500/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Belum ada kolom Kanban
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Konfigurasi kolom kanban terlebih dahulu di{" "}
                <a
                  href={`/workspace/${workspaceId}/settings`}
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Pengaturan Workspace
                </a>
                .
              </p>
            </CardContent>
          </Card>
        ) : (
          <KanbanBoard
            columns={columns}
            tasksByColumn={kanban.tasksByColumn}
            columnMeta={kanban.columnMeta}
            loading={kanban.loading}
            workspace={currentWorkspace}
            selectedTaskIds={kanban.selectedTaskIds}
            onToggleSelect={kanban.toggleTaskSelection}
            onTaskClick={handleTaskClick}
            onQuickCreate={handleQuickCreate}
            onLoadMore={kanban.loadMoreForColumn}
            moveTask={kanban.moveTask}
            reorderInColumn={kanban.reorderInColumn}
          />
        )}
      </div>

      {/* Quick Create Modal */}
      <QuickCreateModal
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        columns={columns}
        members={members}
        defaultColumnId={quickCreateColumnId}
        onCreateTask={handleCreateTask}
        onCreateAndOpen={(taskId) => kanban.setActiveTaskId(taskId)}
      />

      {/* Task Detail Panel */}
      <TaskDetailPanel
        task={kanban.activeTask}
        open={!!kanban.activeTaskId}
        onClose={() => kanban.setActiveTaskId(null)}
        columns={columns}
        members={members}
        labels={kanban.labels}
        currentUserId={user?._id}
        workspaceId={workspaceId}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onArchive={handleArchiveTask}
        onUnarchive={handleUnarchiveTask}
        onWatch={handleWatchTask}
        onUnwatch={handleUnwatchTask}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={kanban.selectedTaskIds.size}
        selectedTaskIds={kanban.selectedTaskIds}
        columns={columns}
        onMoveToColumn={handleBulkMoveToColumn}
        onChangePriority={handleBulkChangePriority}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onClearSelection={kanban.clearSelection}
      />
    </div>
  );
}
