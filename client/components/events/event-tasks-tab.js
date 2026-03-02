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

function TaskListItem({ task, columns, workspaceId, onNavigate }) {
  const column = columns?.find((c) => c._id === task.columnId);
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
  const subtaskTotal = task.subtasks?.length || 0;
  const subtaskDone = task.subtasks?.filter((s) => s.isCompleted).length || 0;

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
        </div>
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
                </div>
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

  const columns = workspace?.kanbanColumns
    ? [...workspace.kanbanColumns].sort((a, b) => a.order - b.order)
    : [];

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
    router.push(`/workspace/${workspaceId}/tasks/kanban?taskId=${task._id}`);
  };

  const createTaskForEvent = () => {
    router.push(
      `/workspace/${workspaceId}/tasks/kanban?newTask=true&eventId=${event._id}`,
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
            {tasks.length} task terkait
          </span>
        </div>
        <div className="flex items-center gap-2">
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
      {tasks.length > 0 ? (
        viewMode === "list" ? (
          <Card>
            <CardContent className="p-0">
              {tasks.map((task) => (
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
                tasks={tasks}
                workspaceId={workspaceId}
                onNavigate={navigateToTask}
              />
            ))}
          </div>
        )
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

