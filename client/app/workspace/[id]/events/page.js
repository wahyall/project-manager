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
  MapPin,
  Inbox,
  Columns3,
  Calendar as CalendarIcon,
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
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
              <CalendarRange className="h-5 w-5 text-white" />
            </div>
            Event
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {scope.isLocked
              ? "Event divisi kamu — dikelompokkan per divisi"
              : "Kelola jadwal, milestone, dan acara penting per divisi"}
          </p>
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
          {userCanCreateEvent && (
            <Button
              className="gap-2 shadow-sm"
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
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{upcomingCount}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{ongoingCount}</p>
              <p className="text-xs text-muted-foreground">Ongoing</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-500/5 border border-gray-500/10">
            <div className="h-8 w-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
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
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="h-1 rounded-t-lg" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-4 w-16" />
                    <div className="flex -space-x-1.5">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/10 mb-6">
              <Inbox className="h-10 w-10 text-violet-500/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {filters.keyword || filters.status.length > 0 || filters.participant
                ? "Tidak ada event yang cocok"
                : "Belum ada event"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              {filters.keyword || filters.status.length > 0 || filters.participant
                ? "Coba ubah filter pencarian kamu."
                : "Buat event pertama untuk mulai mengelola jadwal, milestone, dan acara penting workspace."}
            </p>
            {!filters.keyword &&
              filters.status.length === 0 &&
              !filters.participant && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2"
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
