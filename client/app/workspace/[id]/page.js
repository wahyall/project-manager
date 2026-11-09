"use client";

import { use } from "react";
import Link from "next/link";
import {
  format,
  isPast,
  isToday,
  isTomorrow,
  formatDistanceToNow,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/contexts/auth-context";
import { useDashboard } from "@/hooks/use-dashboard";
import { usePresence } from "@/hooks/use-presence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  CalendarRange,
  Columns3,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  History,
  ListTodo,
  Pin,
  ExternalLink,
  Loader2,
  ChevronRight,
  Flame,
} from "lucide-react";
import dynamic from "next/dynamic";

const BoardCanvas = dynamic(
  () =>
    import("@/components/brainstorming/board-canvas").then(
      (mod) => mod.BoardCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[460px] flex items-center justify-center bg-muted/10 text-muted-foreground text-xs gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Memuat canvas Mading...</span>
      </div>
    ),
  },
);

const PRIORITY_COLORS = {
  low: "bg-slate-400 dark:bg-slate-500",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  critical: "bg-rose-500",
};

function StatCard({
  icon: Icon,
  label,
  value,
  accentColor,
  iconBg,
  href,
  workspaceId,
  loading,
}) {
  const content = (
    <Card className="group relative overflow-hidden rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 shrink-0 w-[240px] sm:w-auto">
      <div
        className={`absolute top-0 inset-x-0 h-1 ${accentColor} opacity-70 group-hover:opacity-100 transition-opacity`}
      />
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground line-clamp-1">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1 rounded-md" />
            ) : (
              <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            )}
          </div>
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} transition-transform group-hover:scale-105 shrink-0 shadow-2xs`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={`/workspace/${workspaceId}${href}`}>{content}</Link>;
  }
  return content;
}

export default function WorkspaceDashboardPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  // Custom hooks for data
  const { data, loading } = useDashboard(id);
  const { onlineUsers } = usePresence(id);

  if (!currentWorkspace) return <></>;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat pagi";
    if (hour < 17) return "Selamat siang";
    if (hour < 21) return "Selamat sore";
    return "Selamat malam";
  };

  // Maps workspace members for the online avatars
  const onlineMembersList =
    currentWorkspace.members?.filter((m) => onlineUsers.has(m.userId?._id || m.userId)) ||
    [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-7 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* 1. Header Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" />
              Ikhtisar Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {greeting()}, {user?.name?.split(" ")[0]}!{" "}
            <span className="inline-block animate-wave origin-bottom-right">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Workspace:{" "}
            <span className="font-semibold text-foreground">
              {currentWorkspace.name}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link href={`/workspace/${id}/tasks`}>
            <Button size="sm" className="gap-2 rounded-xl h-9 text-xs shadow-xs">
              <ListTodo className="w-3.5 h-3.5" />
              Buka Task Board
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Ringkasan Angka (Stats Cards) - horizontal scroll on mobile */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 snap-x hide-scrollbar">
        <StatCard
          icon={ListTodo}
          label="Task Aktif Saya"
          value={data?.stats?.activeTasks || 0}
          accentColor="bg-blue-500"
          iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
          href="/tasks"
          workspaceId={id}
          loading={loading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Selesai Minggu Ini"
          value={data?.stats?.completedThisWeek || 0}
          accentColor="bg-emerald-500"
          iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          href="/tasks"
          workspaceId={id}
          loading={loading}
        />
        <StatCard
          icon={AlertCircle}
          label="Task Overdue"
          value={data?.stats?.overdueTasks || 0}
          accentColor="bg-rose-500"
          iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
          href="/tasks"
          workspaceId={id}
          loading={loading}
        />
        <StatCard
          icon={CalendarRange}
          label="Event Berlangsung"
          value={data?.stats?.ongoingEvents || 0}
          accentColor="bg-violet-500"
          iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
          href="/events"
          workspaceId={id}
          loading={loading}
        />
      </div>

      {/* Mading Workspace (Majalah Dinding / Bulletin Board) */}
      {data?.madingBoard && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Badge className="bg-purple-600 hover:bg-purple-600 text-white font-medium text-xs gap-1.5 px-3 py-1 shadow-xs border-none shrink-0 rounded-full">
                <Pin className="h-3.5 w-3.5" /> Mading Workspace
              </Badge>
              <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                {data.madingBoard.name}
              </h2>
            </div>
            <Link
              href={`/workspace/${id}/brainstorming/${data.madingBoard._id}`}
            >
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 shadow-xs rounded-xl h-8.5"
              >
                Buka Board Lengkap <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <Card className="overflow-hidden rounded-2xl border border-purple-500/30 shadow-xs hover:shadow-md transition-shadow relative bg-card/60">
            <div className="h-[460px] w-full relative bg-muted/10">
              <BoardCanvas
                widgets={data.madingBoard.widgets || []}
                connections={data.madingBoard.connections || []}
                isReadOnly={true}
              />
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Task Saya yang Harus Dikerjakan (My Tasks) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <ListTodo className="h-4 w-4" />
              </div>
              Task Saya
            </h2>
            <Link href={`/workspace/${id}/tasks`}>
              <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground hover:text-foreground">
                Lihat Semua <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
            <div className="divide-y divide-border/60 max-h-[420px] overflow-y-auto">
              {loading ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="p-4 flex gap-3">
                      <Skeleton className="h-4 w-1 bg-muted rounded-full shrink-0" />
                      <div className="space-y-2 w-full">
                        <Skeleton className="h-4 w-3/4 rounded-md" />
                        <Skeleton className="h-3 w-1/2 rounded-md" />
                      </div>
                    </div>
                  ))
              ) : data?.myTasks?.length > 0 ? (
                data.myTasks.map((task) => {
                  const isTaskOverdue =
                    task.dueDate &&
                    isPast(new Date(task.dueDate)) &&
                    !isToday(new Date(task.dueDate));

                  return (
                    <Link
                      key={task._id}
                      href={`/workspace/${id}/tasks?task=${task._id}`}
                    >
                      <div className="p-4 hover:bg-muted/40 transition-colors flex gap-3.5 group">
                        <div
                          className={`w-1 rounded-full shrink-0 my-0.5 ${PRIORITY_COLORS[task.priority] || "bg-slate-400"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {task.title}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-2xs">
                            {task.column && (
                              <Badge
                                variant="outline"
                                className="text-2xs uppercase font-semibold border-border/80 rounded-md px-1.5 py-0"
                                style={{ color: task.column?.color }}
                              >
                                {task.column?.name}
                              </Badge>
                            )}
                            {task.eventId && (
                              <span
                                className="flex items-center text-muted-foreground truncate max-w-[160px]"
                                style={{ color: task.eventId.color }}
                              >
                                <CalendarRange className="mr-1 h-3 w-3 shrink-0" />
                                <span className="truncate">{task.eventId.title}</span>
                              </span>
                            )}
                            {task.dueDate && (
                              <span
                                className={`flex items-center font-medium ${
                                  isTaskOverdue
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <Clock className="mr-1 h-3 w-3 shrink-0" />
                                {format(new Date(task.dueDate), "dd MMM yy", {
                                  locale: idLocale,
                                })}
                                {isTaskOverdue && " (Overdue)"}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 self-center group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-10 text-center text-muted-foreground">
                  <div className="inline-flex p-3 rounded-2xl bg-muted/40 text-muted-foreground mb-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Tidak ada task aktif untukmu saat ini
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Semua penugasan telah diselesaikan! ✨
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 4. Event Mendatang & Berlangsung */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                <CalendarRange className="h-4 w-4" />
              </div>
              Event Mendatang
            </h2>
            <Link href={`/workspace/${id}/events`}>
              <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground hover:text-foreground">
                Lihat Semua <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
            <div className="divide-y divide-border/60 max-h-[420px] overflow-y-auto">
              {loading ? (
                Array(2)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="p-4 flex gap-4">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="space-y-2 w-full">
                        <Skeleton className="h-4 w-1/2 rounded-md" />
                        <Skeleton className="h-3 w-full rounded-md" />
                      </div>
                    </div>
                  ))
              ) : data?.upcomingEvents?.length > 0 ? (
                data.upcomingEvents.map((event) => {
                  const start = new Date(event.startDate);
                  const isEventOngoing = event.status === "ongoing";

                  return (
                    <Link
                      key={event._id}
                      href={`/workspace/${id}/events/${event._id}`}
                    >
                      <div className="p-4 hover:bg-muted/40 transition-colors flex gap-4 group">
                        <div
                          className="h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0 border shadow-2xs"
                          style={{
                            borderColor: event.color || "#8B5CF6",
                            backgroundColor: `${event.color || "#8B5CF6"}12`,
                            color: event.color || "#8B5CF6",
                          }}
                        >
                          <span className="text-2xs font-bold uppercase leading-none">
                            {format(start, "MMM", { locale: idLocale })}
                          </span>
                          <span className="text-lg font-black leading-none mt-1">
                            {format(start, "dd")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 justify-between">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {event.title}
                            </p>
                            {isEventOngoing && (
                              <Badge className="text-2xs h-4.5 bg-emerald-500 hover:bg-emerald-600 text-white px-2 rounded-full shrink-0">
                                Berlangsung
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <ListTodo className="mr-1 h-3.5 w-3.5" />
                              {event.taskCount} Task
                            </span>
                            <span className="flex items-center">
                              <Users className="mr-1 h-3.5 w-3.5" />
                              {event.participants?.length || 0} Peserta
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 self-center group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-10 text-center text-muted-foreground">
                  <div className="inline-flex p-3 rounded-2xl bg-muted/40 text-muted-foreground mb-2">
                    <CalendarRange className="w-6 h-6 text-violet-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Tidak ada event mendatang</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Buat jadwal event baru di modul Events.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 5. Aktivitas Terkini */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-muted text-foreground border border-border/80">
                <History className="h-4 w-4" />
              </div>
              Aktivitas Terkini
            </h2>
            <Link href={`/workspace/${id}/activity`}>
              <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground hover:text-foreground">
                Lihat Semua <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
            <CardContent className="p-0">
              <div className="divide-y divide-border/60 max-h-[350px] overflow-y-auto">
                {loading ? (
                  Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="p-4 flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className="space-y-2 w-full py-1">
                          <Skeleton className="h-3 w-full rounded-md" />
                          <Skeleton className="h-2 w-24 rounded-md" />
                        </div>
                      </div>
                    ))
                ) : data?.recentActivity?.length > 0 ? (
                  data.recentActivity.map((log) => (
                    <div
                      key={log._id}
                      className="p-4 flex items-start gap-3 text-sm hover:bg-muted/30 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-semibold text-xs shadow-2xs">
                        {log.actorId?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed text-foreground">
                          <span className="font-semibold text-foreground">
                            {log.actorId?.name}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {log.actionDescription}
                          </span>{" "}
                          {log.targetName && (
                            <span className="font-medium text-foreground">
                              "{log.targetName}"
                            </span>
                          )}
                        </p>
                        <p className="text-2xs text-muted-foreground mt-1 tabular-nums">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                            locale: idLocale,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-muted-foreground">
                    <p className="text-sm">
                      Belum ada rekaman aktivitas di workspace ini.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 6. Member Online */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Member Online
          </h2>
          <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {onlineMembersList.length > 0 ? (
                  <>
                    <div className="flex -space-x-2 overflow-hidden py-1">
                      {onlineMembersList.slice(0, 10).map((member) => (
                        <Tooltip key={member.userId?._id || member.userId}>
                          <TooltipTrigger asChild>
                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-primary text-xs font-semibold ring-2 ring-emerald-500/30 shadow-xs cursor-pointer hover:scale-110 transition-transform">
                              {member.userId?.name?.charAt(0).toUpperCase() || "M"}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {member.userId?.name || "Member"} (Online)
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    {onlineMembersList.length > 10 && (
                      <div className="flex h-8 items-center rounded-full bg-muted px-3 text-xs font-medium text-muted-foreground">
                        +{onlineMembersList.length - 10} lainnya
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground py-1">
                    Hanya kamu yang sedang aktif di workspace ini.
                  </div>
                )}
              </div>

              <Link href={`/workspace/${id}/settings`} className="block">
                <Button variant="outline" size="sm" className="w-full text-xs rounded-xl h-9 border-border/80 shadow-2xs">
                  <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  Lihat Semua Member ({currentWorkspace.memberCount})
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
