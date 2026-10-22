"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  ListTodo,
  LayoutGrid,
  List,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
  Inbox,
  Users,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { id as localeId } from "date-fns/locale";

const PRIORITY_CONFIG = {
  critical: { label: "Critical", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200" },
  high: { label: "High", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200" },
  medium: { label: "Medium", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200" },
  low: { label: "Low", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200" },
};

const toId = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    return (value._id || value.id || value)?.toString?.() || null;
  }
  return value.toString();
};

const isCoordinationTask = (task) => {
  const divisionIds = new Set(
    [task.divisionId, ...(task.divisionIds || [])]
      .map(toId)
      .filter(Boolean),
  );
  return (
    divisionIds.size > 1 ||
    (task.divisionPics || []).length > 0 ||
    !!task.coordination?.constraints ||
    !!task.coordination?.helpNeeded ||
    !!task.coordination?.followUp
  );
};

const getDivisionList = (task) => {
  const byId = new Map();
  const addDivision = (value, isPrimary) => {
    const id = toId(value);
    if (!id) return;
    const doc = typeof value === "object" && value !== null ? value : null;
    const existing = byId.get(id);
    if (existing) {
      if (!existing.name && doc?.name) existing.name = doc.name;
      if (!existing.color && doc?.color) existing.color = doc.color;
      if (isPrimary) existing.primary = true;
    } else {
      byId.set(id, {
        _id: id,
        name: doc?.name || null,
        color: doc?.color || null,
        primary: isPrimary,
      });
    }
  };

  addDivision(task.divisionId, true);
  (task.divisionIds || []).forEach((division) => addDivision(division, false));

  return [...byId.values()].map((division) => ({
    ...division,
    name: division.name || "Divisi tidak tersedia",
  }));
};

const getPicList = (task) => {
  const divisionsById = new Map(
    getDivisionList(task).map((division) => [division._id, division]),
  );
  const byUser = new Map();

  for (const pic of task.divisionPics || []) {
    const user = typeof pic.userId === "object" ? pic.userId : null;
    const userId = toId(user);
    if (!userId) continue;
    const division = divisionsById.get(toId(pic.divisionId));
    const entry = byUser.get(userId) || { user, divisionNames: [] };
    if (division?.name && !entry.divisionNames.includes(division.name)) {
      entry.divisionNames.push(division.name);
    }
    byUser.set(userId, entry);
  }

  return [...byUser.values()];
};

const hasMultipleDivisions = (task) => getDivisionList(task).length > 1;

function TaskListItem({ task, columns, workspaceId, onNavigate }) {
  const column = columns?.find((c) => c._id === task.columnId);
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
  const subtaskTotal = task.subtasks?.length || 0;
  const subtaskDone = task.subtasks?.filter((s) => s.isCompleted).length || 0;
  const divisionList = getDivisionList(task);
  const picList = getPicList(task);
  const coordination = isCoordinationTask(task);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-accent/50 cursor-pointer transition-colors group"
      onClick={() => onNavigate(task)}
    >
      {/* Status dot */}
      <div
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: column?.color || "#6B7280" }}
      />

      {/* Title & meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {column && (
            <span className="text-[10px] text-muted-foreground">
              {column.name}
            </span>
          )}
          {subtaskTotal > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {subtaskDone}/{subtaskTotal} subtask
            </span>
          )}
          {isCoordinationTask(task) && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
              <Users className="h-2.5 w-2.5" />
              Koordinasi
            </span>
          )}
        </div>
        {divisionList.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {divisionList.slice(0, 3).map((division) => (
              <Badge
                key={division._id}
                variant="outline"
                title={
                  division.primary ? "Divisi peminta" : "Divisi terkait"
                }
                className={cn(
                  "h-4 gap-0.5 px-1 text-[9px] font-normal",
                  division.primary
                    ? "border-amber-300/60 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                    : "text-muted-foreground",
                )}
              >
                {division.primary && <Star className="h-2.5 w-2.5" />}
                <span className="max-w-[110px] truncate">{division.name}</span>
              </Badge>
            ))}
            {divisionList.length > 3 && (
              <span className="text-[9px] text-muted-foreground">
                +{divisionList.length - 3} divisi
              </span>
            )}
          </div>
        )}
      </div>

      {/* Priority */}
      <Badge
        variant="outline"
        className={cn("text-[10px] h-5 px-1.5 shrink-0", priorityConfig.className)}
      >
        {priorityConfig.label}
      </Badge>

      {/* Due date */}
      {task.dueDate && (
        <span
          className={cn(
            "text-xs shrink-0",
            isOverdue
              ? "text-red-600 dark:text-red-400 font-medium"
              : "text-muted-foreground",
          )}
        >
          {format(new Date(task.dueDate), "dd MMM", { locale: localeId })}
        </span>
      )}

      {/* Assignees */}
      {task.assignees?.length > 0 && (
        <div className="flex -space-x-1 shrink-0">
          {task.assignees.slice(0, 3).map((a) => (
            <Tooltip key={a._id}>
              <TooltipTrigger asChild>
                <Avatar className="h-5 w-5 border border-background">
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                    {a.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {a.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* PIC per divisi */}
      {coordination && picList.length > 0 && (
        <div className="flex -space-x-1 shrink-0">
          {picList.slice(0, 3).map(({ user, divisionNames }) => (
            <Tooltip key={user._id}>
              <TooltipTrigger asChild>
                <Avatar className="h-5 w-5 border border-background ring-1 ring-amber-300/60">
                  <AvatarFallback className="text-[8px] bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                PIC
                {divisionNames.length > 0
                  ? ` ${divisionNames.join(", ")}`
                  : ""}
                : {user.name}
              </TooltipContent>
            </Tooltip>
          ))}
          {picList.length > 3 && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-amber-500/10 text-[8px] font-medium text-amber-700 dark:text-amber-400">
              +{picList.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniKanbanColumn({ column, tasks, workspaceId, onNavigate }) {
  const columnTasks = tasks.filter((t) => t.columnId === column._id);

  return (
    <div className="flex-1 min-w-[200px] max-w-[280px]">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: column.color || "#6B7280" }}
        />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {column.name}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {columnTasks.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {columnTasks.map((task) => {
          const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
          const isOverdue =
            task.dueDate &&
            isPast(new Date(task.dueDate)) &&
            !isToday(new Date(task.dueDate));
          const divisionList = getDivisionList(task);
          const picList = getPicList(task);
          const coordination = isCoordinationTask(task);
          return (
            <Card
              key={task._id}
              className="cursor-pointer hover:shadow-sm hover:border-primary/20 transition-all group"
              onClick={() => onNavigate(task)}
            >
              <CardContent className="p-2.5 space-y-1.5">
                <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  {task.title}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] h-4 px-1",
                      priorityConfig.className,
                    )}
                  >
                    {priorityConfig.label}
                  </Badge>
                  {task.dueDate && (
                    <span
                      className={cn(
                        "text-[10px]",
                        isOverdue
                          ? "text-red-500 font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {format(new Date(task.dueDate), "dd MMM", {
                        locale: localeId,
                      })}
                    </span>
                  )}
                  {isCoordinationTask(task) && (
                    <span className="flex items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400">
                      <Users className="h-2.5 w-2.5" />
                      Koordinasi
                    </span>
                  )}
                </div>
                {divisionList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    {divisionList.slice(0, 2).map((division) => (
                      <Badge
                        key={division._id}
                        variant="outline"
                        title={
                          division.primary
                            ? "Divisi peminta"
                            : "Divisi terkait"
                        }
                        className={cn(
                          "h-4 gap-0.5 px-1 text-[9px] font-normal",
                          division.primary
                            ? "border-amber-300/60 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {division.primary && (
                          <Star className="h-2.5 w-2.5" />
                        )}
                        <span className="max-w-[90px] truncate">
                          {division.name}
                        </span>
                      </Badge>
                    ))}
                    {divisionList.length > 2 && (
                      <span className="text-[9px] text-muted-foreground">
                        +{divisionList.length - 2}
                      </span>
                    )}
                  </div>
                )}
                {task.assignees?.length > 0 && (
                  <div className="flex -space-x-1">
                    {task.assignees.slice(0, 3).map((a) => (
                      <Avatar key={a._id} className="h-4 w-4 border border-background">
                        <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                          {a.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
                {coordination && picList.length > 0 && (
                  <div className="flex -space-x-1">
                    {picList.slice(0, 3).map(({ user, divisionNames }) => (
                      <Tooltip key={user._id}>
                        <TooltipTrigger asChild>
                          <Avatar className="h-4 w-4 border border-background ring-1 ring-amber-300/60">
                            <AvatarFallback className="text-[7px] bg-amber-500/10 text-amber-700 dark:text-amber-400">
                              {user.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          PIC
                          {divisionNames.length > 0
                            ? ` ${divisionNames.join(", ")}`
                            : ""}
                          : {user.name}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {picList.length > 3 && (
                      <div className="flex h-4 w-4 items-center justify-center rounded-full border border-background bg-amber-500/10 text-[7px] font-medium text-amber-700 dark:text-amber-400">
                        +{picList.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {columnTasks.length === 0 && (
          <div className="text-center py-4">
            <p className="text-[10px] text-muted-foreground">Kosong</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function EventTasksTab({ event, workspaceId, workspace }) {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list"); // "list" | "kanban"
  const [showCoordinationOnly, setShowCoordinationOnly] = useState(false);

  const columns = workspace?.kanbanColumns
    ? [...workspace.kanbanColumns].sort((a, b) => a.order - b.order)
    : [];

  const displayTasks = showCoordinationOnly
    ? tasks.filter(hasMultipleDivisions)
    : tasks;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/workspaces/${workspaceId}/events/${event._id}/tasks`,
      );
      setTasks(data.data.tasks);
    } catch (err) {
      console.error("Failed to fetch event tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, event._id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const navigateToTask = (task) => {
    router.push(`/workspace/${workspaceId}/tasks?taskId=${task._id}`);
  };

  const createTaskForEvent = () => {
    router.push(
      `/workspace/${workspaceId}/tasks?newTask=true&eventId=${event._id}`,
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {displayTasks.length} task terkait
            {showCoordinationOnly ? " (koordinasi)" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showCoordinationOnly ? "default" : "outline"}
            className="gap-1.5 h-7 text-xs"
            onClick={() => setShowCoordinationOnly((value) => !value)}
            title="Tampilkan task yang melibatkan lebih dari satu divisi"
          >
            <Users className="h-3.5 w-3.5" />
            Koordinasi
          </Button>
          {/* View toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-2.5 py-1 text-xs transition-colors",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "px-2.5 py-1 text-xs transition-colors",
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 text-xs"
            onClick={createTaskForEvent}
          >
            <Plus className="h-3.5 w-3.5" />
            Buat Task
          </Button>
        </div>
      </div>

      {/* Task list or kanban view */}
      {displayTasks.length > 0 ? (
        viewMode === "list" ? (
          <Card>
            <CardContent className="p-0">
              {displayTasks.map((task) => (
                <TaskListItem
                  key={task._id}
                  task={task}
                  columns={columns}
                  workspaceId={workspaceId}
                  onNavigate={navigateToTask}
                />
              ))}
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {columns.map((col) => (
              <MiniKanbanColumn
                key={col._id}
                column={col}
                tasks={displayTasks}
                workspaceId={workspaceId}
                onNavigate={navigateToTask}
              />
            ))}
          </div>
        )
      ) : showCoordinationOnly && tasks.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="font-semibold text-sm mb-1">
              Belum ada task koordinasi
            </h4>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Tambahkan divisi terkait atau isi data koordinasi pada task event
              ini untuk melihatnya di sini.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCoordinationOnly(false)}
            >
              Tampilkan semua task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted mb-4">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <h4 className="font-semibold text-sm mb-1">
              Belum ada task terkait
            </h4>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Buat task baru yang terhubung ke event ini atau hubungkan task yang sudah ada dari Kanban Board.
            </p>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={createTaskForEvent}
            >
              <Plus className="h-3.5 w-3.5" />
              Buat Task Baru
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

