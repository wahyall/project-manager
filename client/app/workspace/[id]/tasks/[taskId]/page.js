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
  Clock,
  Sparkles,
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
  const [divisions, setDivisions] = useState([]);

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

      // Fetch divisions
      api
        .get(`/workspaces/${workspaceId}/divisions`)
        .then((res) => setDivisions(res.data?.data?.divisions || []))
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
        router.push(`/workspace/${workspaceId}/tasks`);
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

  // ── Handlers ───────────────────────────────────
  const handleUpdate = async (updates) => {
    try {
      const { data } = await api.put(
        `/workspaces/${workspaceId}/tasks/${taskId}`,
        updates,
      );
      setTask(data.data.task);
      toast.success("Task diperbarui");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengupdate task");
      throw err;
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
      toast.success("Task dihapus");
      router.push(`/workspace/${workspaceId}/tasks`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus task");
    }
  };

  const handleArchive = async () => {
    try {
      await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/archive`);
      setTask((prev) => ({ ...prev, isArchived: true }));
      toast.success("Task diarsipkan");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengarsipkan task");
    }
  };

  const handleUnarchive = async () => {
    try {
      await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/unarchive`);
      setTask((prev) => ({ ...prev, isArchived: false }));
      toast.success("Task diunarsipkan");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal membatalkan arsip");
    }
  };

  const handleWatch = async () => {
    try {
      await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/watch`);
      setTask((prev) => ({
        ...prev,
        watchers: [...(prev.watchers || []), user._id],
      }));
      toast.success("Kamu sekarang memantau task ini");
    } catch (err) {
      toast.error("Gagal mengikuti task");
    }
  };

  const handleUnwatch = async () => {
    try {
      await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}/watch`);
      setTask((prev) => ({
        ...prev,
        watchers: (prev.watchers || []).filter(
          (w) => (w._id || w) !== user._id,
        ),
      }));
      toast.success("Berhenti memantau task");
    } catch (err) {
      toast.error("Gagal berhenti mengikuti task");
    }
  };

  const handleUploadAttachment = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(
      `/workspaces/${workspaceId}/tasks/${taskId}/attachments`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    setTask((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), data.data.attachment],
    }));
    toast.success("Lampiran berhasil diunggah");
  };

  const handleDeleteAttachment = async (attachmentId) => {
    await api.delete(
      `/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}`,
    );
    setTask((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter(
        (a) => a._id !== attachmentId,
      ),
    }));
    toast.success("Lampiran dihapus");
  };

  // ── Loading state ──────────────────────────────
  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  // ── Not found ──────────────────────────────────
  if (!task) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/80 rounded-2xl bg-card/40">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-1">Task tidak ditemukan</h2>
          <p className="text-xs text-muted-foreground mb-5 max-w-xs">
            Task ini mungkin telah dihapus atau kamu tidak memiliki akses.
          </p>
          <Link href={`/workspace/${workspaceId}/tasks`}>
            <Button variant="outline" className="gap-2 rounded-xl text-xs">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Daftar Task
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">
      {/* Top navigation & action bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href={`/workspace/${workspaceId}/tasks`}>
            <Button variant="ghost" size="icon" className="h-8.5 w-8.5 rounded-xl text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2 truncate">
            <span
              className={cn("h-3 w-3 rounded-full shrink-0 shadow-xs ring-2 ring-background", priority.color)}
            />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Detail Task
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Priority badge */}
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-semibold rounded-full px-2.5 py-0.5 border gap-1.5",
              task.priority === "critical" &&
                "border-rose-500/30 text-rose-600 bg-rose-500/10 dark:text-rose-400",
              task.priority === "high" &&
                "border-amber-500/30 text-amber-600 bg-amber-500/10 dark:text-amber-400",
              task.priority === "medium" &&
                "border-blue-500/30 text-blue-600 bg-blue-500/10 dark:text-blue-400",
              task.priority === "low" &&
                "border-slate-500/30 text-slate-600 bg-slate-500/10 dark:text-slate-400",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", priority.color)} />
            {priority.label}
          </Badge>

          {/* Column/Status badge */}
          {currentColumn && (
            <Badge variant="outline" className="text-[10px] font-semibold rounded-full px-2.5 py-0.5 border gap-1.5">
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
              className="text-[10px] font-semibold rounded-full px-2.5 py-0.5 border-amber-500/30 text-amber-600 bg-amber-500/10"
            >
              Diarsipkan
            </Badge>
          )}

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8.5 w-8.5 rounded-xl">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-44 shadow-lg">
              {task.isArchived ? (
                <DropdownMenuItem onClick={handleUnarchive} className="gap-2 text-xs rounded-lg">
                  <ArchiveRestore className="h-4 w-4" />
                  Unarsipkan
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchive} className="gap-2 text-xs rounded-lg">
                  <Archive className="h-4 w-4" />
                  Arsipkan
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive gap-2 text-xs rounded-lg"
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
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {task.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span>
            Dibuat{" "}
            {task.createdAt &&
              format(new Date(task.createdAt), "d MMMM yyyy HH:mm", {
                locale: localeId,
              })}
          </span>
          {task.createdBy && (
            <span>
              &bull; oleh{" "}
              <strong className="text-foreground">
                {typeof task.createdBy === "string"
                  ? task.createdBy
                  : task.createdBy.name}
              </strong>
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
              value="detail"
              className="gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Detail Task</span>
            </TabsTrigger>
            <TabsTrigger
              value="comment"
              className="gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Komentar & Diskusi</span>
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <History className="h-3.5 w-3.5" />
              <span>Jejak Riwayat</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Detail */}
        <TabsContent value="detail" className="mt-0 focus-visible:outline-none">
          <div className="rounded-2xl border border-border/80 bg-card/90 p-5 sm:p-7 shadow-xs backdrop-blur-xs">
            <TabDetail
              task={task}
              columns={columns}
              members={members}
              labels={labels}
              events={events}
              divisions={divisions}
              currentUserId={user?._id}
              onUpdate={handleUpdate}
              onWatch={handleWatch}
              onUnwatch={handleUnwatch}
              onUploadAttachment={handleUploadAttachment}
              onDeleteAttachment={handleDeleteAttachment}
              workspaceId={workspaceId}
            />
          </div>
        </TabsContent>

        {/* Tab: Comment */}
        <TabsContent value="comment" className="mt-0 focus-visible:outline-none">
          <div className="rounded-2xl border border-border/80 bg-card/90 p-5 sm:p-7 shadow-xs backdrop-blur-xs h-[600px] overflow-hidden">
            <TabComment
              workspaceId={workspaceId}
              taskId={taskId}
              currentUserId={user?._id}
              members={members}
            />
          </div>
        </TabsContent>

        {/* Tab: Activity */}
        <TabsContent value="activity" className="mt-0 focus-visible:outline-none">
          <div className="rounded-2xl border border-border/80 bg-card/90 p-5 sm:p-7 shadow-xs backdrop-blur-xs">
            <TabActivity workspaceId={workspaceId} taskId={taskId} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-destructive">
              Konfirmasi Hapus Task
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Apakah kamu yakin ingin menghapus task &quot;{task.title}&quot;? Tindakan ini tidak bisa dibatalkan dan seluruh lampiran serta komentar di dalamnya akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel className="rounded-xl text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 rounded-xl text-xs font-semibold"
              onClick={() => {
                handleDelete();
                setDeleteDialogOpen(false);
              }}
            >
              Ya, Hapus Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
