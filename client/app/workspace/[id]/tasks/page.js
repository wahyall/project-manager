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
import { canCreateTask } from "@/lib/permissions";
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
  Sparkles,
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

  // ── RBAC: Hanya owner, admin, dan ketua divisi yang bisa buat task ──
  const userCanCreateTask = canCreateTask({
    role: currentWorkspace?.role,
    divisions: scope.divisions,
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
    const isCalendarView = qs.get("view") === "calendar";
    if (isCalendarView) {
      setViewMode("calendar");
    }
    const deepTaskId = qs.get("taskId") || qs.get("task");
    if (deepTaskId) {
      if (isCalendarView) {
        calendar.setActiveTaskId(deepTaskId);
      } else {
        setViewMode("kanban");
        kanban.setActiveTaskId(deepTaskId);
      }
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
      setTimeout(() => {
        setCalendarTitle(calendarViewRef.current?.getTitle() || "");
      }, 0);
    },
    [calendar],
  );

  // ── Date click in calendar: open quick create with prefilled date ──
  const handleDateClick = useCallback(
    (arg) => {
      if (!userCanCreateTask) return;
      setQuickCreateDefaultDueDate(arg.date);
      setQuickCreateColumnId(
        kanban.columns[0]?._id || calendar.columns[0]?._id || null,
      );
      setQuickCreateOpen(true);
    },
    [userCanCreateTask, kanban.columns, calendar.columns],
  );

  // ── Event click in calendar: open task detail panel or event detail ──
  const handleCalendarEventClick = useCallback(
    (clickInfo) => {
      const id =
        typeof clickInfo === "string"
          ? clickInfo
          : clickInfo?.event?.id || clickInfo?.id;
      if (!id) return;
      if (id.startsWith("event-")) {
        const eventId = id.replace("event-", "");
        router.push(`/workspace/${workspaceId}/events/${eventId}`);
        return;
      }
      calendar.setActiveTaskId(id);
    },
    [calendar, router, workspaceId],
  );

  // ── Event drag & drop in calendar ────────────────
  const handleEventDrop = useCallback(
    async (taskIdOrInfo, start, end) => {
      let taskId = taskIdOrInfo;
      let newStart = start;
      let newEnd = end;
      let revertFn = null;

      if (
        taskIdOrInfo &&
        typeof taskIdOrInfo === "object" &&
        taskIdOrInfo.event
      ) {
        taskId = taskIdOrInfo.event.id;
        newStart = taskIdOrInfo.event.start;
        newEnd = taskIdOrInfo.event.end;
        revertFn = taskIdOrInfo.revert;
      }

      if (
        !taskId ||
        (typeof taskId === "string" && taskId.startsWith("event-"))
      ) {
        revertFn?.();
        return false;
      }

      try {
        const ok = await calendar.updateTaskDates(taskId, newStart, newEnd);
        if (ok) {
          kanban.fetchTasks();
          toast.success("Tenggat waktu task diperbarui");
          return true;
        } else {
          revertFn?.();
          toast.error("Gagal memindahkan task");
          return false;
        }
      } catch (err) {
        revertFn?.();
        toast.error("Gagal memindahkan task");
        return false;
      }
    },
    [calendar, kanban],
  );

  // ── Event resize in calendar ─────────────────────
  const handleEventResize = useCallback(
    async (taskIdOrInfo, start, end) => {
      let taskId = taskIdOrInfo;
      let newStart = start;
      let newEnd = end;
      let revertFn = null;

      if (
        taskIdOrInfo &&
        typeof taskIdOrInfo === "object" &&
        taskIdOrInfo.event
      ) {
        taskId = taskIdOrInfo.event.id;
        newStart = taskIdOrInfo.event.start;
        newEnd = taskIdOrInfo.event.end;
        revertFn = taskIdOrInfo.revert;
      }

      if (
        !taskId ||
        (typeof taskId === "string" && taskId.startsWith("event-"))
      ) {
        revertFn?.();
        return false;
      }

      try {
        const ok = await calendar.updateTaskDates(taskId, newStart, newEnd);
        if (ok) {
          kanban.fetchTasks();
          toast.success("Tenggat waktu task diperbarui");
          return true;
        } else {
          revertFn?.();
          toast.error("Gagal mengubah durasi task");
          return false;
        }
      } catch (err) {
        revertFn?.();
        toast.error("Gagal mengubah durasi task");
        return false;
      }
    },
    [calendar, kanban],
  );

  // ── Task click (kanban): open detail panel ───────
  const handleTaskClick = useCallback(
    (taskOrId) => {
      const taskId = typeof taskOrId === "object" ? taskOrId?._id : taskOrId;
      if (taskId) {
        kanban.setActiveTaskId(taskId);
      }
    },
    [kanban],
  );

  // ── Quick create handler ─────────────────────────
  const handleQuickCreate = useCallback((columnId) => {
    setQuickCreateColumnId(columnId);
    setQuickCreateDefaultDueDate(null);
    setQuickCreateOpen(true);
  }, []);

  const handleCreateTask = useCallback(
    async (taskData) => {
      try {
        await kanban.createTask(taskData);
        calendar.refetch();
        toast.success("Task berhasil dibuat");
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
    <div className="flex flex-col h-full pb-20 md:pb-0">
      {/* Page header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
              <Columns3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Task Management
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-2xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {columns.length} Kolom
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {viewMode === "kanban"
                  ? `${totalTasks} task aktif dalam papan kanban${divisionSuffix}`
                  : `${taskCount} task terjadwal dalam rentang tanggal${divisionSuffix}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* View mode: Kanban | Kalender */}
            <div className="flex items-center rounded-xl border border-border/80 bg-muted/40 p-1 shadow-2xs">
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
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      isActive
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8.5 w-8.5 rounded-xl text-muted-foreground"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="text-xs max-w-[200px] rounded-xl p-3 shadow-lg"
              >
                <p className="font-semibold mb-1 text-foreground">
                  Pintasan Keyboard
                </p>
                <p className="flex justify-between py-0.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-2xs font-mono">
                    N
                  </kbd>{" "}
                  <span>Buat task baru</span>
                </p>
                {viewMode === "kanban" ? (
                  <p className="flex justify-between py-0.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-2xs font-mono">
                      F
                    </kbd>{" "}
                    <span>Fokus pencarian</span>
                  </p>
                ) : (
                  <p className="flex justify-between py-0.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-2xs font-mono">
                      T
                    </kbd>{" "}
                    <span>Ke hari ini</span>
                  </p>
                )}
                <p className="flex justify-between py-0.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-2xs font-mono">
                    Esc
                  </kbd>{" "}
                  <span>Tutup panel</span>
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Refresh */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8.5 w-8.5 rounded-xl border-border/80 shadow-2xs"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Muat ulang data</TooltipContent>
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
            {userCanCreateTask && (
              <Button
                className="gap-2 rounded-xl h-8.5 text-xs shadow-xs"
                onClick={() => {
                  setQuickCreateColumnId(columns[0]?._id || null);
                  setQuickCreateDefaultDueDate(null);
                  setQuickCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Tambah Task</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter toolbar */}
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

      <Separator className="border-border/60" />

      {/* View: Kanban */}
      {viewMode === "kanban" && (
        <div className="flex-1 overflow-hidden px-4 sm:px-6 lg:px-8 py-4">
          {kanban.error ? (
            <Card className="rounded-2xl border-destructive/30 shadow-xs bg-card/60">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Gagal Memuat Data Task
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {kanban.error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => kanban.fetchTasks()}
                  className="rounded-xl text-xs"
                >
                  Coba Lagi
                </Button>
              </CardContent>
            </Card>
          ) : columns.length === 0 ? (
            <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-4 shadow-2xs">
                  <Columns3 className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">
                  Belum Ada Kolom Kanban
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  Konfigurasikan alur kerja dan kolom kanban terlebih dahulu di{" "}
                  <a
                    href={`/workspace/${workspaceId}/settings`}
                    className="text-primary font-medium underline underline-offset-2 hover:text-primary/80"
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
              onQuickCreate={userCanCreateTask ? handleQuickCreate : undefined}
              onLoadMore={kanban.loadMoreForColumn}
              moveTask={kanban.moveTask}
              reorderInColumn={kanban.reorderInColumn}
            />
          )}
        </div>
      )}

      {/* View: Kalender */}
      {viewMode === "calendar" && (
        <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          {calendar.error ? (
            <Card className="rounded-2xl border-destructive/30 shadow-xs bg-card/60">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Gagal Memuat Kalender
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {calendar.error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => calendar.refetch()}
                  className="rounded-xl text-xs"
                >
                  Coba Lagi
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
              <CardContent className="p-3 sm:p-5">
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
            <span className="text-2xs text-muted-foreground font-semibold uppercase tracking-wider">
              Prioritas:
            </span>
            {[
              { label: "Low", color: "bg-slate-400" },
              { label: "Medium", color: "bg-blue-500" },
              { label: "High", color: "bg-amber-500" },
              { label: "Critical", color: "bg-rose-500" },
            ].map((p) => (
              <div key={p.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${p.color}`} />
                <span className="text-2xs text-muted-foreground font-medium">
                  {p.label}
                </span>
              </div>
            ))}

            <Separator orientation="vertical" className="h-3 hidden sm:block" />

            <span className="text-2xs text-muted-foreground/80">
              Tarik & letakkan task untuk menggeser deadline &bull; Klik tanggal
              untuk membuat task cepat
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
        onSubmit={handleCreateTask}
      />

      {/* Task Detail Panel (drawer dari kanan) */}
      <TaskDetailPanel
        task={viewMode === "kanban" ? kanban.activeTask : calendar.activeTask}
        taskId={
          viewMode === "kanban" ? kanban.activeTaskId : calendar.activeTaskId
        }
        open={
          viewMode === "kanban"
            ? !!kanban.activeTaskId
            : !!calendar.activeTaskId
        }
        onClose={() => {
          if (viewMode === "kanban") {
            kanban.setActiveTaskId(null);
          } else {
            calendar.setActiveTaskId(null);
          }
        }}
        columns={columns}
        members={members}
        labels={kanban.labels}
        events={events}
        divisions={scope.isLocked ? scope.myDivisions : scope.divisions}
        allDivisions={scope.divisions}
        currentUserId={user?._id}
        memberRole={currentWorkspace?.role}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onArchive={handleArchiveTask}
        onUnarchive={handleUnarchiveTask}
        onWatch={handleWatchTask}
        onUnwatch={handleUnwatchTask}
        workspaceId={workspaceId}
      />

      {/* Bulk Action Bar (muncul saat checkbox tercentang) */}
      {viewMode === "kanban" && kanban.selectedTaskIds.size > 0 && (
        <BulkActionBar
          selectedCount={kanban.selectedTaskIds.size}
          columns={columns}
          onClearSelection={kanban.clearSelection}
          onMoveToColumn={(columnId) =>
            handleBulkMoveToColumn(Array.from(kanban.selectedTaskIds), columnId)
          }
          onChangePriority={(priority) =>
            handleBulkChangePriority(
              Array.from(kanban.selectedTaskIds),
              priority,
            )
          }
          onArchive={() =>
            handleBulkArchive(Array.from(kanban.selectedTaskIds))
          }
          onDelete={() => handleBulkDelete(Array.from(kanban.selectedTaskIds))}
        />
      )}
    </div>
  );
}
