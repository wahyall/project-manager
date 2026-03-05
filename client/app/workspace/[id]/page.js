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
} from "lucide-react";

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  guest: "Guest",
};

const ROLE_COLORS = {
  owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  member:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  guest: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const PRIORITY_COLORS = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  critical: "bg-red-500",
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
  workspaceId,
  loading,
}) {
  const content = (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20 shrink-0 w-[240px] sm:w-auto">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
          </div>
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${color} transition-transform group-hover:scale-110`}
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
    currentWorkspace.members?.filter((m) => onlineUsers.has(m.userId._id)) ||
    [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* 1. Header Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            {greeting()}, {user?.name?.split(" ")[0]}!{" "}
            <span className="inline-block animate-wave">👋</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Workspace:{" "}
            <span className="font-semibold text-foreground">
              {currentWorkspace.name}
            </span>
          </p>
        </div>
      </div>

      {/* 2. Ringkasan Angka (Stats Cards) - horizontal scroll on mobile */}
      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 snap-x hide-scrollbar">
        <StatCard
          icon={ListTodo}
          label="Task Aktif Saya"
          value={data?.stats?.activeTasks || 0}
          color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          href="/tasks/kanban"
          workspaceId={id}
          loading={loading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Task Selesai Minggu Ini"
          value={data?.stats?.completedThisWeek || 0}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
          href="/tasks/kanban"
          workspaceId={id}
          loading={loading}
        />
        <StatCard
          icon={AlertCircle}
          label="Task Overdue"
          value={data?.stats?.overdueTasks || 0}
          color="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
          href="/tasks/kanban"
          workspaceId={id}
          loading={loading}
        />
        <StatCard
          icon={CalendarRange}
          label="Event Berlangsung"
          value={data?.stats?.ongoingEvents || 0}
          color="bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
          href="/events"
          workspaceId={id}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Task Saya yang Harus Dikerjakan (My Tasks) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              Task Saya
            </h2>
            <Link href={`/workspace/${id}/tasks/kanban`}>
              <Button variant="ghost" size="sm" className="text-xs">
                Lihat Semua <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>

          <Card className="overflow-hidden">
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {loading ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="p-4 flex gap-3">
                      <Skeleton className="h-4 w-1 bg-gray-200 rounded-full shrink-0" />
                      <div className="space-y-2 w-full">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
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
                      href={`/workspace/${id}/tasks/kanban?task=${task._id}`}
                    >
                      <div className="p-4 hover:bg-muted/50 transition-colors flex gap-3 group">
                        <div
                          className={`w-1 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] || "bg-gray-400"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {task.title}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase font-semibold border-muted-foreground/20"
                              style={{ color: task.column?.color }}
                            >
                              {task.column?.name}
                            </Badge>
                            {task.eventId && (
                              <span
                                className="flex items-center text-muted-foreground"
                                style={{ color: task.eventId.color }}
                              >
                                <CalendarRange className="mr-1 h-3 w-3" />
                                {task.eventId.title}
                              </span>
                            )}
                            {task.dueDate && (
                              <span
                                className={`flex items-center ${isTaskOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}
                              >
                                <Clock className="mr-1 h-3 w-3" />
                                {format(new Date(task.dueDate), "dd MMM yy", {
                                  locale: idLocale,
                                })}
                                {isTaskOverdue && " (Overdue)"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">
                    Tidak ada task aktif untukmu saat ini.
                  </p>
                  <p className="text-xs mt-1">Santai dulu! 🏖️</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 4. Event Mendatang & Berlangsung */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-violet-500" />
              Event Mendatang
            </h2>
            <Link href={`/workspace/${id}/events`}>
              <Button variant="ghost" size="sm" className="text-xs">
                Lihat Semua <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>

          <Card className="overflow-hidden">
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {loading ? (
                Array(2)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="p-4 flex gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="space-y-2 w-full">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-full" />
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
                      <div className="p-4 hover:bg-muted/50 transition-colors flex gap-4 group">
                        <div
                          className="h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0 border shadow-sm"
                          style={{
                            borderColor: event.color,
                            backgroundColor: `${event.color}10`,
                            color: event.color,
                          }}
                        >
                          <span className="text-[10px] font-bold uppercase leading-none">
                            {format(start, "MMM", { locale: idLocale })}
                          </span>
                          <span className="text-lg font-black leading-none mt-1">
                            {format(start, "dd")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 justify-between">
                            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                              {event.title}
                            </p>
                            {isEventOngoing && (
                              <Badge className="text-[9px] h-4 bg-emerald-500 hover:bg-emerald-600 px-1.5 shrink-0">
                                ONGOING
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <ListTodo className="mr-1 h-3 w-3" />
                              {event.taskCount} Task
                            </span>
                            <span className="flex items-center">
                              <Users className="mr-1 h-3 w-3" />
                              {event.participants?.length || 0} Peserta
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">Tidak ada event mendatang.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 5. Aktivitas Terkini */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Aktivitas Terkini
            </h2>
            <Link href={`/workspace/${id}/activity`}>
              <Button variant="ghost" size="sm" className="text-xs">
                Lihat Semua <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y max-h-[350px] overflow-y-auto">
                {loading ? (
                  Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="p-4 flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className="space-y-2 w-full py-1">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-2 w-24" />
                        </div>
                      </div>
                    ))
                ) : data?.recentActivity?.length > 0 ? (
                  data.recentActivity.map((log) => (
                    <div
                      key={log._id}
                      className="p-4 flex gap-3 text-sm hover:bg-muted/30"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-xs overflow-hidden">
                        {log.actorId?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="leading-snug">
                          <span className="font-semibold">
                            {log.actorId?.name}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {log.actionDescription}
                          </span>{" "}
                          {log.targetName && (
                            <span className="font-medium">
                              "{log.targetName}"
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                            locale: idLocale,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="text-sm">
                      Belum ada aktivitas di workspace ini.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 6. Member Online */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Member Online
          </h2>
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-2">
                {onlineMembersList.length > 0 ? (
                  <>
                    <div className="flex -space-x-2 overflow-hidden">
                      {onlineMembersList.slice(0, 10).map((member) => (
                        <Tooltip key={member.userId?._id}>
                          <TooltipTrigger asChild>
                            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-primary text-xs font-semibold ring-2 ring-emerald-500/20">
                              {member.userId?.name?.charAt(0).toUpperCase()}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {member.userId?.name} (Online)
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
                  <div className="text-sm text-muted-foreground pt-1 pb-2">
                    Hanya kamu yang sedang online.
                  </div>
                )}
              </div>

              <Link href={`/workspace/${id}/settings`} className="block mt-4">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <Users className="mr-2 h-3.5 w-3.5" />
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
