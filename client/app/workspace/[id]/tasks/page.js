"use client";

import { use, useRef, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/contexts/auth-context";
import { useKanban } from "@/hooks/use-kanban";
import { useCalendar } from "@/hooks/use-calendar";
import { useExport } from "@/hooks/use-export";
import { useDivisionScope } from "@/hooks/use-division-scope";
import { DivisionFilter } from "@/components/workspace/division-filter";
import api from "@/lib/api";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { FilterToolbar } from "@/components/kanban/filter-toolbar";
import { QuickCreateModal } from "@/components/kanban/quick-create-modal";
import { TaskDetailPanel } from "@/components/kanban/task-detail-panel";
import { BulkActionBar } from "@/components/kanban/bulk-action-bar";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarView } from "@/components/calendar/calendar-view";
import { ExportMenu } from "@/components/export-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TasksPage({ params }) {
  const { id: workspaceId } = use(params);
  const router = useRouter();
  const { currentWorkspace, members, fetchMembers } = useWorkspace();
  const { user } = useAuth();

  // ── View mode: Kanban | Kalender (sama seperti halaman Event) ──
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "calendar"

  // ── Scope divisi: otomatis sesuai divisi user, owner/admin bebas ──
  const scope = useDivisionScope(workspaceId, {
    role: currentWorkspace?.role,
    userId: user?._id,
  });

  // ── Kanban hook ──────────────────────────────────
  const kanban = useKanban(workspaceId, currentWorkspace);

  // ── Calendar hook (khusus Task) ──────────────────
  const calendar = useCalendar(workspaceId, currentWorkspace, {
    fixedType: "tasks",
    divisionId: scope.apiParam,
  });

  const { exporting, exportTaskCSV, exportTaskXLSX, exportTaskPDF } =
    useExport();

  // Sinkronkan filter divisi ke hook kanban (memicu refetch per kolom)
  useEffect(() => {
    kanban.setFilters((prev) =>
      prev.divisionId === scope.apiParam
        ? prev
        : { ...prev, divisionId: scope.apiParam },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.apiParam]);

  // ── Deep link: ?view=calendar, ?taskId=/?task=, ?newTask=true ──
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateColumnId, setQuickCreateColumnId] = useState(null);
  const [quickCreateDefaultDueDate, setQuickCreateDefaultDueDate] =
    useState(null);
  const [quickCreateDefaultEventId, setQuickCreateDefaultEventId] =
    useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("view") === "calendar") {
      setViewMode("calendar");
    }
    const deepTaskId = qs.get("taskId") || qs.get("task");
    if (deepTaskId) {
      setViewMode("kanban");
      kanban.setActiveTaskId(deepTaskId);
    } else if (qs.get("newTask") === "true") {
      setViewMode("kanban");
      setQuickCreateDefaultEventId(qs.get("eventId") || null);
      setQuickCreateOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Search input ref (for keyboard shortcut) ─────
  const searchInputRef = useRef(null);

  // ── Calendar view state ──────────────────────────
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [calendarTitle, setCalendarTitle] = useState("");
  const calendarViewRef = useRef(null);

  // ── Events list for selectors ────────────────────
  const [events, setEvents] = useState([]);

  // ── Fetch members & events on mount ──────────────
  useEffect(() => {
    if (workspaceId) {
      fetchMembers(workspaceId);
      // Fetch events for event selector (non-deleted, all statuses)
      api
        .get(
          `/workspaces/${workspaceId}/events?limit=200&sortBy=startDate&sortOrder=desc`,
        )
        .then((res) => setEvents(res.data?.data?.events || []))
        .catch(() => {});
    }
  }, [workspaceId, fetchMembers]);

  // ── Calendar navigation handlers ─────────────────
  const handlePrev = useCallback(() => {
    calendarViewRef.current?.prev();
    setCalendarTitle(calendarViewRef.current?.getTitle() || "");
  }, []);

  const handleNext = useCallback(() => {
    calendarViewRef.current?.next();
    setCalendarTitle(calendarViewRef.current?.getTitle() || "");
  }, []);

  const handleToday = useCallback(() => {
    calendarViewRef.current?.today();
    setCalendarTitle(calendarViewRef.current?.getTitle() || "");
  }, []);

  // ── Date range change (from FullCalendar datesSet) ──
  const handleDateRangeChange = useCallback(
    ({ start, end }) => {
      calendar.setDateRange({ start, end });
      // Update title after a tick (FC title updates async)
      setTimeout(() => {
        setCalendarTitle(calendarViewRef.current?.getTitle() || "");
      }, 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calendar.setDateRange],
  );

  // ── Date click → open quick create with prefilled due date ──
  const handleDateClick = useCallback((date) => {
    setQuickCreateColumnId(null);
    setQuickCreateDefaultDueDate(date);
    setQuickCreateOpen(true);
  }, []);

  // ── Open quick create from kanban column ─────────
  const handleQuickCreate = useCallback((columnId) => {
    setQuickCreateColumnId(columnId);
    setQuickCreateDefaultDueDate(null);
    setQuickCreateOpen(true);
  }, []);

  // ── Task click (kanban) → open detail panel ──────
  const handleTaskClick = useCallback(
    (taskId) => {
      kanban.setActiveTaskId(taskId);
    },
    [kanban],
  );

  // ── Event click (calendar) → task panel / event detail ──
  const handleCalendarEventClick = useCallback(
    (fcEventId) => {
      // If it's an event (prefixed with "event-"), navigate to event detail
      if (fcEventId.startsWith("event-")) {
        const eventId = fcEventId.replace("event-", "");
        router.push(`/workspace/${workspaceId}/events/${eventId}`);
        return;
      }
      // Otherwise it's a task → open detail panel
      calendar.setActiveTaskId(fcEventId);
    },
    [calendar.setActiveTaskId, router, workspaceId],
  );

  // ── Drag → update dates ──────────────────────────
  const handleEventDrop = useCallback(
    (taskId, newStart, newEnd) => {
      calendar.updateTaskDates(taskId, newStart, newEnd);
      toast.success("Tanggal task diperbarui");
    },
    [calendar.updateTaskDates],
  );

  const handleEventResize = useCallback(
    (taskId, newStart, newEnd) => {
      calendar.updateTaskDates(taskId, newStart, newEnd);
      toast.success("Rentang waktu task diperbarui");
    },
    [calendar.updateTaskDates],
  );

  // ── Create task (shared, sinkron ke kedua view) ──
  const handleCreateTask = useCallback(
    async (taskData) => {
      try {
        const task = await kanban.createTask(taskData);
        calendar.refetch();
        toast.success("Task berhasil dibuat");
        return task;
      } catch (err) {
        toast.error("Gagal membuat task");
        throw err;
      }
    },
    [kanban, calendar],
  );

  // ── Update task (shared) ─────────────────────────
  const handleUpdateTask = useCallback(
    async (taskId, updates) => {
      try {
        await kanban.updateTask(taskId, updates);
        calendar.refetch();
      } catch (err) {
        toast.error("Gagal mengupdate task");
        throw err;
      }
    },
    [kanban, calendar],
  );

  // ── Delete task (shared) ─────────────────────────
  const handleDeleteTask = useCallback(
    async (taskId) => {
      try {
        await kanban.deleteTask(taskId);
        if (calendar.activeTaskId === taskId) {
          calendar.setActiveTaskId(null);
        }
        calendar.refetch();
        toast.success("Task berhasil dihapus");
      } catch (err) {
        toast.error("Gagal menghapus task");
      }
    },
    [kanban, calendar],
  );

  // ── Archive/Unarchive task (shared) ──────────────
  const handleArchiveTask = useCallback(
    async (taskId) => {
      try {
        await kanban.archiveTask(taskId);
        calendar.refetch();
        toast.success("Task berhasil diarsipkan");
      } catch (err) {
        toast.error("Gagal mengarsipkan task");
      }
    },
    [kanban, calendar],
  );

  const handleUnarchiveTask = useCallback(
    async (taskId) => {
      try {
        await kanban.unarchiveTask(taskId);
        calendar.refetch();
        toast.success("Task berhasil diunarsipkan");
      } catch (err) {
        toast.error("Gagal membatalkan arsip");
      }
    },
    [kanban, calendar],
  );

  // ── Watch/Unwatch task (shared) ──────────────────
  const handleWatchTask = useCallback(
    async (taskId) => {
      try {
        await kanban.watchTask(taskId);
        calendar.refetch();
        toast.success("Kamu sekarang menjadi watcher");
      } catch (err) {
        toast.error("Gagal menjadi watcher");
      }
    },
    [kanban, calendar],
  );

  const handleUnwatchTask = useCallback(
    async (taskId) => {
      try {
        await kanban.unwatchTask(taskId);
        calendar.refetch();
        toast.success("Berhenti menjadi watcher");
      } catch (err) {
        toast.error("Gagal berhenti menjadi watcher");
      }
    },
    [kanban, calendar],
  );

  // ── Bulk action handlers (kanban) ────────────────
  const handleBulkMoveToColumn = useCallback(
    async (taskIds, columnId) => {
      try {
        await kanban.bulkMoveToColumn(taskIds, columnId);
        calendar.refetch();
        toast.success(`${taskIds.length} task dipindahkan`);
      } catch (err) {
        toast.error("Gagal memindahkan task");
      }
    },
    [kanban, calendar],
  );

  const handleBulkChangePriority = useCallback(
    async (taskIds, priority) => {
      try {
        await kanban.bulkUpdateField(taskIds, "priority", priority);
        calendar.refetch();
        toast.success(`Prioritas ${taskIds.length} task diperbarui`);
      } catch (err) {
        toast.error("Gagal mengubah prioritas");
      }
    },
    [kanban, calendar],
  );

  const handleBulkArchive = useCallback(
    async (taskIds) => {
      try {
        await kanban.bulkArchive(taskIds);
        calendar.refetch();
        toast.success(`${taskIds.length} task diarsipkan`);
      } catch (err) {
        toast.error("Gagal mengarsipkan task");
      }
    },
    [kanban, calendar],
  );

  const handleBulkDelete = useCallback(
    async (taskIds) => {
      try {
        await kanban.bulkDelete(taskIds);
        calendar.refetch();
        toast.success(`${taskIds.length} task dihapus`);
      } catch (err) {
        toast.error("Gagal menghapus task");
      }
    },
    [kanban, calendar],
  );

  // ── Refresh (sesuai view aktif) ──────────────────
  const handleRefresh = useCallback(() => {
    if (viewMode === "kanban") {
      kanban.fetchTasks();
    } else {
      calendar.refetch();
    }
  }, [viewMode, kanban, calendar]);

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
          setQuickCreateDefaultDueDate(null);
          setQuickCreateOpen(true);
          break;
        case "f":
        case "F":
          if (viewMode === "kanban") {
            e.preventDefault();
            searchInputRef.current?.focus();
          }
          break;
        case "t":
        case "T":
          if (viewMode === "calendar") {
            e.preventDefault();
            handleToday();
          }
          break;
        case "Escape":
          if (viewMode === "kanban") {
            if (kanban.activeTaskId) {
              kanban.setActiveTaskId(null);
            } else if (kanban.selectedTaskIds.size > 0) {
              kanban.clearSelection();
            }
          } else if (calendar.activeTaskId) {
            calendar.setActiveTaskId(null);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [kanban, calendar, viewMode, handleToday]);

  // ── Early return if workspace not loaded ─────────
  if (!currentWorkspace) return null;

  const columns = kanban.columns.length > 0 ? kanban.columns : calendar.columns;
  const totalTasks = kanban.allTasks.filter((t) => !t.isArchived).length;
  const taskCount = calendar.tasks.length;
  const divisionSuffix =
    scope.selected !== "all" &&
    scope.selected !== "mine" &&
    scope.getDivision(scope.selected)
      ? ` • ${scope.getDivision(scope.selected).name}`
      : "";

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
              <h1 className="text-xl font-bold text-foreground">Task</h1>
              <p className="text-xs text-muted-foreground">
                {viewMode === "kanban"
                  ? `${totalTasks} task aktif di ${columns.length} kolom${divisionSuffix}`
                  : `${taskCount} task dalam tampilan${divisionSuffix}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode: Kanban | Kalender */}
            <div className="flex items-center rounded-lg border bg-background shadow-sm p-0.5">
              {[
                { value: "kanban", label: "Kanban", icon: Columns3 },
                { value: "calendar", label: "Kalender", icon: CalendarIcon },
              ].map((opt) => {
                const Icon = opt.icon;
                const isActive = viewMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                    onClick={() => setViewMode(opt.value)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Keyboard shortcuts hint */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Keyboard className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                <p className="font-semibold mb-1">Keyboard Shortcuts</p>
                <p>
                  <kbd className="px-1 rounded bg-muted text-[10px]">N</kbd>{" "}
                  Buat task baru
                </p>
                {viewMode === "kanban" ? (
                  <p>
                    <kbd className="px-1 rounded bg-muted text-[10px]">F</kbd>{" "}
                    Fokus pencarian
                  </p>
                ) : (
                  <p>
                    <kbd className="px-1 rounded bg-muted text-[10px]">T</kbd>{" "}
                    Ke hari ini
                  </p>
                )}
                <p>
                  <kbd className="px-1 rounded bg-muted text-[10px]">Esc</kbd>{" "}
                  Tutup panel
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Refresh */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>

            {/* Export (kanban) */}
            {viewMode === "kanban" && (
              <ExportMenu
                exporting={exporting}
                onExportCSV={() => exportTaskCSV(workspaceId, kanban.filters)}
                onExportXLSX={() => exportTaskXLSX(workspaceId, kanban.filters)}
                onExportPDF={() => exportTaskPDF(workspaceId, kanban.filters)}
                pdfLabel="Export Kanban PDF"
              />
            )}

            {/* New task button */}
            <Button
              className="gap-2 shadow-sm h-9"
              onClick={() => {
                setQuickCreateColumnId(columns[0]?._id || null);
                setQuickCreateDefaultDueDate(null);
                setQuickCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Task</span>
            </Button>
          </div>
        </div>

        {/* Filter toolbar (sesuai view aktif) */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <DivisionFilter scope={scope} />
          <div className="flex-1 min-w-0">
            {viewMode === "kanban" ? (
              <FilterToolbar
                filters={kanban.filters}
                setFilters={kanban.setFilters}
                activeFilterCount={kanban.activeFilterCount}
                members={members}
                labels={kanban.labels}
                searchInputRef={searchInputRef}
              />
            ) : (
              <CalendarToolbar
                title={calendarTitle}
                currentView={currentView}
                onViewChange={setCurrentView}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                filters={calendar.filters}
                onFiltersChange={calendar.setFilters}
                activeFilterCount={calendar.activeFilterCount}
                members={members}
                labels={kanban.labels}
                fixedType="tasks"
              />
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* View: Kanban */}
      {viewMode === "kanban" && (
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
      )}

      {/* View: Kalender */}
      {viewMode === "calendar" && (
        <div className="flex-1 overflow-auto px-6 py-4">
          {calendar.error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-10 w-10 text-destructive/60 mb-4" />
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Terjadi kesalahan
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {calendar.error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => calendar.refetch()}
                >
                  Coba Lagi
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <CalendarView
                  ref={calendarViewRef}
                  events={calendar.calendarEvents}
                  currentView={currentView}
                  loading={calendar.loading}
                  onDateRangeChange={handleDateRangeChange}
                  onDateClick={handleDateClick}
                  onEventClick={handleCalendarEventClick}
                  onEventDrop={handleEventDrop}
                  onEventResize={handleEventResize}
                />
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 px-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Prioritas:
            </span>
            {[
              { label: "Low", color: "bg-slate-400" },
              { label: "Medium", color: "bg-amber-400" },
              { label: "High", color: "bg-orange-500" },
              { label: "Critical", color: "bg-red-500" },
            ].map((p) => (
              <div key={p.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${p.color}`} />
                <span className="text-[10px] text-muted-foreground">
                  {p.label}
                </span>
              </div>
            ))}

            <Separator orientation="vertical" className="h-3 hidden sm:block" />

            <span className="text-[10px] text-muted-foreground/70">
              Drag task untuk ubah tanggal • Klik tanggal kosong untuk buat task
              baru
            </span>
          </div>
        </div>
      )}

      {/* Quick Create Modal (shared) */}
      <QuickCreateModal
        open={quickCreateOpen}
        onOpenChange={(open) => {
          setQuickCreateOpen(open);
          if (!open) setQuickCreateDefaultEventId(null);
        }}
        columns={columns}
        members={members}
        events={events}
        workspaceId={workspaceId}
        divisions={scope.isLocked ? scope.myDivisions : scope.divisions}
        defaultColumnId={quickCreateColumnId || columns[0]?._id}
        defaultDueDate={quickCreateDefaultDueDate}
        defaultEventId={quickCreateDefaultEventId}
        defaultDivisionId={
          scope.selected !== "all" &&
          scope.selected !== "mine" &&
          scope.selected !== "none"
            ? scope.selected
            : undefined
        }
        onCreateTask={handleCreateTask}
        onCreateAndOpen={(taskId) =>
          viewMode === "kanban"
            ? kanban.setActiveTaskId(taskId)
            : calendar.setActiveTaskId(taskId)
        }
      />

      {/* Task Detail Panel — Kanban */}
      <TaskDetailPanel
        task={kanban.activeTask}
        open={viewMode === "kanban" && !!kanban.activeTaskId}
        onClose={() => kanban.setActiveTaskId(null)}
        columns={columns}
        members={members}
        labels={kanban.labels}
        events={events}
        divisions={scope.isLocked ? scope.myDivisions : scope.divisions}
        allDivisions={scope.divisions}
        currentUserId={user?._id}
        memberRole={currentWorkspace?.role}
        workspaceId={workspaceId}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onArchive={handleArchiveTask}
        onUnarchive={handleUnarchiveTask}
        onWatch={handleWatchTask}
        onUnwatch={handleUnwatchTask}
      />

      {/* Task Detail Panel — Kalender */}
      <TaskDetailPanel
        task={calendar.activeTask}
        open={viewMode === "calendar" && !!calendar.activeTaskId}
        onClose={() => calendar.setActiveTaskId(null)}
        columns={columns}
        members={members}
        labels={kanban.labels}
        events={events}
        divisions={scope.isLocked ? scope.myDivisions : scope.divisions}
        allDivisions={scope.divisions}
        currentUserId={user?._id}
        memberRole={currentWorkspace?.role}
        workspaceId={workspaceId}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onArchive={handleArchiveTask}
        onUnarchive={handleUnarchiveTask}
        onWatch={handleWatchTask}
        onUnwatch={handleUnwatchTask}
      />

      {/* Bulk Action Bar (kanban) */}
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
