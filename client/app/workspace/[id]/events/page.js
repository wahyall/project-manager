"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/contexts/auth-context";
import { useEvents } from "@/hooks/use-events";
import { useDivisionScope } from "@/hooks/use-division-scope";
import { DivisionFilter } from "@/components/workspace/division-filter";
import { EventKanbanBoard } from "@/components/events/event-kanban-board";
import { EventCalendarView } from "@/components/events/event-calendar-view";
import { EventFilterToolbar } from "@/components/events/event-filter-toolbar";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarRange,
  Plus,
  CalendarDays,
  Clock,
  CheckCircle2,
  Inbox,
  Columns3,
  Calendar as CalendarIcon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import { canCreateEvent } from "@/lib/permissions";

export default function EventsPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { currentWorkspace, members, fetchMembers } = useWorkspace();
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "calendar"

  // ── Scope divisi: otomatis sesuai divisi user, owner/admin bebas ──
  const scope = useDivisionScope(id, {
    role: currentWorkspace?.role,
    userId: user?._id,
  });

  // ── RBAC: Hanya owner, admin, dan ketua divisi yang bisa buat event ──
  const userCanCreateEvent = canCreateEvent({
    role: currentWorkspace?.role,
    divisions: scope.divisions,
    userId: user?._id,
  });

  const {
    events,
    loading,
    error,
    filters,
    setFilters,
    divisionId,
    setDivisionId,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    createEvent,
    updateEvent,
    fetchEvents,
  } = useEvents(id, {
    divisionIds: scope.isLocked ? scope.myDivisionIds : null,
    includeNone: true,
  });

  // Sinkronkan filter divisi hook dengan scope (auto per divisi user)
  useEffect(() => {
    setDivisionId(scope.apiParam);
  }, [scope.apiParam, setDivisionId]);

  // Fetch members for participant filters & create dialog
  useEffect(() => {
    if (id) {
      fetchMembers(id);
    }
  }, [id, fetchMembers]);

  const handleCreate = async (eventData) => {
    const { data } = await api.post(`/workspaces/${id}/events`, eventData);
    const newEvent = data.data.event;
    const ideaChanges = data.data.ideaChanges || [];

    toast.success("Event berhasil dibuat!");

    // Status ide berubah sendiri, jadi user diberi tahu supaya tidak kaget
    ideaChanges
      .filter((c) => c.to === "direalisasi")
      .forEach((c) => {
        toast.info(`Ide "${c.title}" ditandai direalisasi`);
      });

    await fetchEvents(1);
    return newEvent;
  };

  const handleStatusChange = useCallback(
    async (eventId, status) => {
      try {
        await updateEvent(eventId, { status });
        toast.success(
          status === "completed"
            ? "Event selesai"
            : status === "ongoing"
              ? "Event berjalan"
              : "Event dijadwalkan",
        );
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal mengubah status");
      }
    },
    [updateEvent],
  );

  const handleEventClick = (event) => {
    const eventId = typeof event === "string" ? event : event._id;
    router.push(`/workspace/${id}/events/${eventId}`);
  };

  if (!currentWorkspace) return null;

  // Stats
  const upcomingCount = events.filter((e) => e.status === "upcoming").length;
  const ongoingCount = events.filter((e) => e.status === "ongoing").length;
  const completedCount = events.filter((e) => e.status === "completed").length;

  // Divisi untuk picker (terkunci → hanya divisinya)
  const divisionOptions = scope.isLocked ? scope.myDivisions : scope.divisions;
  const defaultDivisionId =
    scope.selected !== "all" &&
    scope.selected !== "mine" &&
    scope.selected !== "none"
      ? scope.selected
      : undefined;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" />
              Manajemen Program & Acara
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <CalendarRange className="h-5 w-5" />
            </div>
            Event & Milestone
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {scope.isLocked
              ? "Event divisi kamu — dikelompokkan secara terstruktur"
              : "Kelola agenda, kepanitiaan, tenggat waktu, dan koordinasi acara"}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* View mode toggle */}
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

          {userCanCreateEvent && (
            <Button
              className="gap-2 rounded-xl h-9 text-xs shadow-xs"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Buat Event
            </Button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-3 gap-3.5">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-card/60 border border-border/80 shadow-xs backdrop-blur-xs">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {upcomingCount}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                Upcoming
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-card/60 border border-border/80 shadow-xs backdrop-blur-xs">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {ongoingCount}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                Ongoing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-card/60 border border-border/80 shadow-xs backdrop-blur-xs">
            <div className="h-10 w-10 rounded-xl bg-muted text-muted-foreground border border-border/60 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {completedCount}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                Completed
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter toolbar: divisi + filter event */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <DivisionFilter scope={scope} />
        <div className="flex-1 min-w-0">
          <EventFilterToolbar
            filters={filters}
            setFilters={setFilters}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            members={members}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="rounded-2xl border-border/80 shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <div className="flex -space-x-1.5">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View: Kanban */}
      {!loading && viewMode === "kanban" && events.length > 0 && (
        <EventKanbanBoard
          events={events}
          getDivision={scope.getDivision}
          onEventClick={handleEventClick}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* View: Kalender Event */}
      {!loading && viewMode === "calendar" && (
        <EventCalendarView
          workspaceId={id}
          workspace={currentWorkspace}
          divisionId={divisionId}
          members={members}
          onEventClick={handleEventClick}
          onDateClick={() => setCreateDialogOpen(true)}
        />
      )}

      {/* Empty state (kanban) */}
      {!loading && viewMode === "kanban" && events.length === 0 && !error && (
        <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 mb-4 shadow-2xs">
              <Inbox className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              {filters.keyword ||
              filters.status.length > 0 ||
              filters.participant
                ? "Tidak ada event yang cocok dengan filter"
                : "Belum ada agenda event"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
              {filters.keyword ||
              filters.status.length > 0 ||
              filters.participant
                ? "Coba sesuaikan kata kunci atau bersihkan kriteria filter pencarian."
                : "Rencanakan kegiatan organisasi, milestone kepanitiaan, atau proyek baru bersama tim."}
            </p>
            {!filters.keyword &&
              filters.status.length === 0 &&
              !filters.participant &&
              userCanCreateEvent && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2 rounded-xl text-xs shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  Buat Event Pertama
                </Button>
              )}
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
        workspaceId={id}
        divisions={divisionOptions}
        defaultDivisionId={defaultDivisionId}
      />
    </div>
  );
}
