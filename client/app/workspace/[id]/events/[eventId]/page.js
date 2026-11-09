"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspace } from "@/contexts/workspace-context";
import { useEvents } from "@/hooks/use-events";
import { useExport } from "@/hooks/use-export";
import { canManageEvent } from "@/lib/permissions";
import { useDivisionScope } from "@/hooks/use-division-scope";
import { useAuth } from "@/contexts/auth-context";
import { EventOverviewTab } from "@/components/events/event-overview-tab";
import { EventTasksTab } from "@/components/events/event-tasks-tab";
import { EventSpreadsheetTab } from "@/components/spreadsheet/event-spreadsheet-tab";
import { EventActivityTab } from "@/components/activity/event-activity-tab";
import { EventNotesTab } from "@/components/events/event-notes-tab";
import { EventPipelineTab } from "@/components/events/event-pipeline-tab";
import { DeleteEventDialog } from "@/components/events/delete-event-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  CalendarRange,
  ListTodo,
  Table2,
  History,
  GitBranch,
  Loader2,
  FileText,
  Download,
  StickyNote,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const STATUS_CONFIG = {
  upcoming: {
    label: "Upcoming",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
  },
  ongoing: {
    label: "Ongoing",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Completed",
    className:
      "bg-muted text-muted-foreground border-border/60",
    dot: "bg-muted-foreground/60",
  },
};

export default function EventDetailPage({ params }) {
  const { id, eventId } = use(params);
  const router = useRouter();
  const { currentWorkspace, members, fetchMembers } = useWorkspace();
  const { user } = useAuth();
  const {
    getEvent,
    updateEvent,
    deleteEvent,
  } = useEvents(id);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { exporting, exportEventPDF } = useExport();

  // Divisi workspace (untuk baris Divisi di tab Overview)
  const scope = useDivisionScope(id, {
    role: currentWorkspace?.role,
    userId: user?._id,
  });

  // RBAC: Hanya owner, admin, dan ketua divisi terkait yang boleh kelola event
  const canManage = canManageEvent({
    event,
    role: currentWorkspace?.role,
    divisions: scope.divisions,
    userId: user?._id,
  });

  // Fetch event detail
  const fetchEventDetail = useCallback(async () => {
    setLoading(true);
    try {
      const eventData = await getEvent(eventId);
      setEvent(eventData);
    } catch (err) {
      console.error("Failed to fetch event:", err);
      toast.error("Gagal memuat event");
    } finally {
      setLoading(false);
    }
  }, [eventId, getEvent]);

  useEffect(() => {
    fetchEventDetail();
  }, [fetchEventDetail]);

  // Fetch members
  useEffect(() => {
    if (id) fetchMembers(id);
  }, [id, fetchMembers]);

  // Handler: update event
  const handleUpdate = useCallback(
    async (updates) => {
      const updatedEvent = await updateEvent(eventId, updates);
      setEvent(updatedEvent);
      return updatedEvent;
    },
    [eventId, updateEvent],
  );

  // Handler: delete event
  const handleDelete = async () => {
    try {
      await deleteEvent(eventId);
      toast.success("Event berhasil dihapus");
      router.push(`/workspace/${id}/events`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus event");
    }
  };

  if (!currentWorkspace) return null;

  // Loading state
  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-6 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Not found
  if (!event) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/80 rounded-2xl bg-card/40">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
            <CalendarRange className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-1">Event tidak ditemukan</h2>
          <p className="text-xs text-muted-foreground mb-5 max-w-xs">
            Event ini mungkin telah dihapus atau kamu tidak memiliki akses.
          </p>
          <Link href={`/workspace/${id}/events`}>
            <Button variant="outline" className="gap-2 rounded-xl text-xs">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Daftar Event
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.upcoming;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-24 md:pb-8">
      {/* Top navigation & Action bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href={`/workspace/${id}/events`}>
            <Button variant="ghost" size="icon" className="h-8.5 w-8.5 rounded-xl text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2 truncate">
            <div
              className="h-3 w-3 rounded-full shrink-0 shadow-xs ring-2 ring-background"
              style={{ backgroundColor: event.color || "#8B5CF6" }}
            />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Detail Event
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={cn("text-2xs font-semibold rounded-full px-2.5 py-0.5 border", statusConfig.className)}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full mr-1.5",
                statusConfig.dot,
              )}
            />
            {statusConfig.label}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8.5 w-8.5 rounded-xl">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-44 shadow-lg">
              <DropdownMenuItem
                onClick={() => exportEventPDF(id, eventId)}
                disabled={exporting}
                className="gap-2 text-xs rounded-lg"
              >
                <Download className="h-4 w-4" />
                {exporting ? "Mengekspor..." : "Export Dokumen PDF"}
              </DropdownMenuItem>
              {canManage && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive text-xs rounded-lg gap-2"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus Event
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Event Header Banner */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {event.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Clock className="w-3.5 h-3.5 text-primary" />
            {format(new Date(event.startDate), "dd MMMM yyyy", {
              locale: localeId,
            })}{" "}
            —{" "}
            {format(new Date(event.endDate), "dd MMMM yyyy", {
              locale: localeId,
            })}
          </span>
          {event.taskCount > 0 && (
            <span className="text-muted-foreground/80">
              &bull; {event.taskCount} task terhubung
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-5"
      >
        <div className="border-b border-border/60 pb-px">
          <TabsList className="bg-muted/40 p-1 rounded-xl border border-border/60 h-auto inline-flex flex-wrap gap-1">
            <TabsTrigger
              value="overview"
              className="gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <ListTodo className="h-3.5 w-3.5" />
              <span>Task</span>
              {event.taskCount > 0 && (
                <span className="ml-1 h-4 min-w-[16px] rounded-full bg-primary/10 text-primary text-2xs flex items-center justify-center font-bold px-1">
                  {event.taskCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="pipeline"
              className="gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>Pipeline</span>
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <StickyNote className="h-3.5 w-3.5" />
              <span>Notes</span>
            </TabsTrigger>
            <TabsTrigger
              value="spreadsheet"
              className="gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Table2 className="h-3.5 w-3.5" />
              <span>Spreadsheet</span>
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <History className="h-3.5 w-3.5" />
              <span>Activity</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
          <EventOverviewTab
            event={event}
            onUpdate={handleUpdate}
            members={members}
            workspaceId={id}
            divisions={
              scope.isLocked ? scope.myDivisions : scope.divisions
            }
            readOnly={!canManage}
            canEditStatus={currentWorkspace?.role !== "guest"}
          />
        </TabsContent>

        {/* Tab: Tasks */}
        <TabsContent value="tasks" className="mt-0 focus-visible:outline-none">
          <EventTasksTab
            event={event}
            workspaceId={id}
            workspace={currentWorkspace}
          />
        </TabsContent>

        {/* Tab: Pipeline */}
        <TabsContent value="pipeline" className="mt-0 focus-visible:outline-none">
          <EventPipelineTab
            event={event}
            workspaceId={id}
            workspace={currentWorkspace}
            members={members}
            divisions={scope.isLocked ? scope.myDivisions : scope.divisions}
            allDivisions={scope.divisions}
            memberRole={currentWorkspace?.role}
          />
        </TabsContent>

        {/* Tab: Notes */}
        <TabsContent value="notes" className="mt-0 focus-visible:outline-none">
          <EventNotesTab
            event={event}
            workspaceId={id}
            members={members}
            memberRole={currentWorkspace?.role}
          />
        </TabsContent>

        {/* Tab: Spreadsheet */}
        <TabsContent value="spreadsheet" className="mt-0 focus-visible:outline-none">
          <EventSpreadsheetTab event={event} workspaceId={id} />
        </TabsContent>

        {/* Tab: Activity */}
        <TabsContent value="activity" className="mt-0 focus-visible:outline-none">
          <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
            <CardContent className="pt-6 sm:p-6">
              <EventActivityTab workspaceId={id} eventId={eventId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete dialog */}
      <DeleteEventDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        event={event}
        onDelete={handleDelete}
      />
    </div>
  );
}
