"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { TabDetail } from "@/components/kanban/tab-detail";
import { TabComment } from "@/components/kanban/tab-comment";
import { TabActivity } from "@/components/kanban/tab-activity";
import { PRIORITY_CONFIG } from "@/components/kanban/task-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  Archive,
  ArchiveRestore,
  FileText,
  MessageSquare,
  History,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TaskDetailPage({ params }) {
  const { id: workspaceId, taskId } = use(params);
  const router = useRouter();
  const { currentWorkspace, members, fetchMembers } = useWorkspace();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("detail");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Workspace data for tab-detail
  const [labels, setLabels] = useState([]);
  const [events, setEvents] = useState([]);

  // Columns from workspace
  const columns = (currentWorkspace?.kanbanColumns || [])
    .slice()
    .sort((a, b) => a.order - b.order);

  // ── Fetch task detail ──────────────────────────
  const fetchTask = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/workspaces/${workspaceId}/tasks/${taskId}`,
      );
      setTask(data.data.task);
    } catch (err) {
      console.error("Failed to fetch task:", err);
      toast.error("Gagal memuat task");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  // ── Fetch members, labels, events on mount ─────
  useEffect(() => {
    if (workspaceId) {
      fetchMembers(workspaceId);

      // Fetch labels
      api
        .get(`/workspaces/${workspaceId}/labels`)
        .then((res) => setLabels(res.data?.data?.labels || []))
        .catch(() => {});

      // Fetch events
      api
        .get(
          `/workspaces/${workspaceId}/events?limit=200&sortBy=startDate&sortOrder=desc`,
        )
        .then((res) => setEvents(res.data?.data?.events || []))
        .catch(() => {});
    }
  }, [workspaceId, fetchMembers]);

  // ── Socket.io real-time sync ───────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !taskId) return;

    const handleTaskUpdated = ({ task: updatedTask }) => {
      if (updatedTask?._id === taskId) {
        setTask(updatedTask);
      }
    };

    const handleTaskMoved = ({ task: updatedTask }) => {
      if (updatedTask?._id === taskId) {
        setTask(updatedTask);
      }
    };

    const handleTaskDeleted = ({ taskId: deletedId }) => {
      if (deletedId === taskId) {
        toast.info("Task ini telah dihapus");
        router.push(`/workspace/${workspaceId}/tasks/kanban`);
      }
    };

    const handleTaskArchived = ({ taskId: archivedId, isArchived }) => {
      if (archivedId === taskId) {
        setTask((prev) => (prev ? { ...prev, isArchived } : prev));
      }
    };

    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:moved", handleTaskMoved);
    socket.on("task:deleted", handleTaskDeleted);
    socket.on("task:archived", handleTaskArchived);

    return () => {
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:moved", handleTaskMoved);
      socket.off("task:deleted", handleTaskDeleted);
      socket.off("task:archived", handleTaskArchived);
    };
  }, [taskId, workspaceId, router]);

  // ── Handler: update task ───────────────────────
  const handleUpdate = useCallback(
    async (updates) => {
      if (!task) return;
      // Optimistic update
      setTask((prev) => ({ ...prev, ...updates }));
      try {
        const { data } = await api.put(
          `/workspaces/${workspaceId}/tasks/${taskId}`,
          updates,
        );
        setTask(data.data.task);
      } catch (err) {
        toast.error("Gagal mengupdate task");
        // Revert
        fetchTask();
      }
    },
    [task, workspaceId, taskId, fetchTask],
  );

  // ── Handler: delete task ───────────────────────
  const handleDelete = useCallback(async () => {
    try {
      await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
      toast.success("Task berhasil dihapus");
      router.push(`/workspace/${workspaceId}/tasks/kanban`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus task");
    }
  }, [workspaceId, taskId, router]);

  // ── Handler: archive / unarchive ───────────────
  const handleArchive = useCallback(async () => {
    try {
      await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/archive`);
      setTask((prev) => (prev ? { ...prev, isArchived: true } : prev));
      toast.success("Task berhasil diarsipkan");
    } catch (err) {
      toast.error("Gagal mengarsipkan task");
    }
  }, [workspaceId, taskId]);

  const handleUnarchive = useCallback(async () => {
    try {
      await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/unarchive`);
      setTask((prev) => (prev ? { ...prev, isArchived: false } : prev));
      toast.success("Task berhasil diunarsipkan");
    } catch (err) {
      toast.error("Gagal membatalkan arsip");
    }
  }, [workspaceId, taskId]);

  // ── Handler: watch / unwatch ───────────────────
  const handleWatch = useCallback(async () => {
    try {
      await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/watch`);
      const { data } = await api.get(
        `/workspaces/${workspaceId}/tasks/${taskId}`,
      );
      setTask(data.data.task);
      toast.success("Kamu sekarang menjadi watcher");
    } catch (err) {
      toast.error("Gagal menjadi watcher");
    }
  }, [workspaceId, taskId]);

  const handleUnwatch = useCallback(async () => {
    try {
      await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}/watch`);
      const { data } = await api.get(
        `/workspaces/${workspaceId}/tasks/${taskId}`,
      );
      setTask(data.data.task);
      toast.success("Berhenti menjadi watcher");
    } catch (err) {
      toast.error("Gagal berhenti menjadi watcher");
    }
  }, [workspaceId, taskId]);

  // ── Handler: upload attachment ─────────────────
  const handleUploadAttachment = useCallback(
    async (file) => {
      if (!task) return;
      const formData = new FormData();
      formData.append("file", file);
      await api.post(
        `/workspaces/${workspaceId}/tasks/${taskId}/attachments`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      // Refresh task data
      const { data } = await api.get(
        `/workspaces/${workspaceId}/tasks/${taskId}`,
      );
      setTask(data.data.task);
    },
    [task, workspaceId, taskId],
  );

  // ── Handler: delete attachment ─────────────────
  const handleDeleteAttachment = useCallback(
    async (attachmentId) => {
      if (!task) return;
      await api.delete(
        `/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}`,
      );
      // Refresh task data
      const { data } = await api.get(
        `/workspaces/${workspaceId}/tasks/${taskId}`,
      );
      setTask(data.data.task);
    },
    [task, workspaceId, taskId],
  );

  if (!currentWorkspace) return null;

  // ── Loading state ──────────────────────────────
  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-60 rounded-lg" />
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────
  if (!task) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-lg font-semibold mb-2">Task tidak ditemukan</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Task ini mungkin telah dihapus atau tidak tersedia.
          </p>
          <Link href={`/workspace/${workspaceId}/tasks/kanban`}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Kanban Board
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  // Find column name
  const currentColumn = columns.find((col) => {
    const taskColId =
      typeof task.columnId === "string"
        ? task.columnId
        : task.columnId?.toString();
    return col._id === taskColId;
  });

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      {/* Breadcrumb & actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/workspace/${workspaceId}/tasks/kanban`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <span
              className={cn("h-3 w-3 rounded-full shrink-0", priority.color)}
            />
            <span className="text-sm text-muted-foreground">Task</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Priority badge */}
          <Badge
            variant="outline"
            className={cn(
              "text-xs h-6 gap-1.5",
              task.priority === "critical" &&
                "border-red-300 text-red-600 dark:border-red-800 dark:text-red-400",
              task.priority === "high" &&
                "border-orange-300 text-orange-600 dark:border-orange-800 dark:text-orange-400",
              task.priority === "medium" &&
                "border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400",
              task.priority === "low" &&
                "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", priority.color)} />
            {priority.label}
          </Badge>

          {/* Column/Status badge */}
          {currentColumn && (
            <Badge variant="outline" className="text-xs h-6 gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: currentColumn.color }}
              />
              {currentColumn.name}
            </Badge>
          )}

          {/* Archived badge */}
          {task.isArchived && (
            <Badge
              variant="outline"
              className="text-xs h-6 border-amber-300 text-amber-600"
            >
              Diarsipkan
            </Badge>
          )}

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {task.isArchived ? (
                <DropdownMenuItem onClick={handleUnarchive} className="gap-2">
                  <ArchiveRestore className="h-4 w-4" />
                  Unarsipkan
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchive} className="gap-2">
                  <Archive className="h-4 w-4" />
                  Arsipkan
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive gap-2"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Hapus Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Task Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{task.title}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Dibuat{" "}
            {task.createdAt &&
              format(new Date(task.createdAt), "d MMMM yyyy HH:mm", {
                locale: localeId,
              })}
          </span>
          {task.createdBy && (
            <span>
              oleh{" "}
              {typeof task.createdBy === "string"
                ? task.createdBy
                : task.createdBy.name}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="w-full grid grid-cols-3 h-10">
          <TabsTrigger value="detail" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Detail</span>
          </TabsTrigger>
          <TabsTrigger value="comment" className="gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Komentar</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs sm:text-sm">
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Detail */}
        <TabsContent value="detail" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <TabDetail
                task={task}
                columns={columns}
                members={members}
                labels={labels}
                events={events}
                currentUserId={user?._id}
                onUpdate={handleUpdate}
                onWatch={handleWatch}
                onUnwatch={handleUnwatch}
                onUploadAttachment={handleUploadAttachment}
                onDeleteAttachment={handleDeleteAttachment}
                workspaceId={workspaceId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Comment */}
        <TabsContent value="comment" className="mt-0">
          <Card>
            <CardContent className="pt-6 h-[600px] overflow-hidden">
              <TabComment
                workspaceId={workspaceId}
                taskId={taskId}
                currentUserId={user?._id}
                members={members}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Activity */}
        <TabsContent value="activity" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <TabActivity workspaceId={workspaceId} taskId={taskId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Task</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus task &quot;{task.title}&quot;?
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                handleDelete();
                setDeleteDialogOpen(false);
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
