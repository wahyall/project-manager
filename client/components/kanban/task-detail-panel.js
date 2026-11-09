"use client";

import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  X,
  Archive,
  ArchiveRestore,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Clock,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TabDetail } from "./tab-detail";
import { TabComment } from "./tab-comment";
import { TabActivity } from "./tab-activity";
import { PRIORITY_CONFIG } from "./task-card";
import { useIsMobile } from "@/hooks/use-mobile";
import { canManageTask } from "@/lib/permissions";
import api from "@/lib/api";

export function TaskDetailPanel({
  task: initialTask,
  taskId,
  open: openProp,
  onClose,
  columns,
  members,
  labels,
  events,
  divisions = [],
  allDivisions = [],
  currentUserId,
  memberRole = "member",
  workspaceId,
  onUpdate,
  onDelete,
  onArchive,
  onUnarchive,
  onWatch,
  onUnwatch,
}) {
  const [activeTab, setActiveTab] = useState("detail");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const [fetchedTask, setFetchedTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(false);

  // If initialTask is provided, use it; otherwise use fetchedTask
  const task = initialTask || fetchedTask;
  const isOpen =
    openProp !== undefined ? openProp : Boolean(initialTask || taskId);

  useEffect(() => {
    // If panel is open and taskId provided, but no initialTask (or id mismatch), fetch it
    if (
      isOpen &&
      taskId &&
      (!initialTask || initialTask._id !== taskId) &&
      workspaceId
    ) {
      let isMounted = true;
      setLoadingTask(true);
      api
        .get(`/workspaces/${workspaceId}/tasks/${taskId}`)
        .then((res) => {
          if (isMounted) {
            setFetchedTask(res.data?.data?.task || null);
          }
        })
        .catch((err) => {
          console.error("Gagal mengambil detail task:", err);
        })
        .finally(() => {
          if (isMounted) setLoadingTask(false);
        });
      return () => {
        isMounted = false;
      };
    } else if (!isOpen) {
      setFetchedTask(null);
    }
  }, [isOpen, taskId, initialTask, workspaceId]);

  const handleUpdate = useCallback(
    async (updates) => {
      if (!task) return;
      await onUpdate?.(task._id, updates);
    },
    [task, onUpdate],
  );

  const handleUploadAttachment = useCallback(
    async (file) => {
      if (!task) return;
      const formData = new FormData();
      formData.append("file", file);
      await api.post(
        `/workspaces/${workspaceId}/tasks/${task._id}/attachments`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      // Refresh task data
      const { data } = await api.get(
        `/workspaces/${workspaceId}/tasks/${task._id}`,
      );
      await onUpdate?.(task._id, { attachments: data.data.task.attachments });
    },
    [task, workspaceId, onUpdate],
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentId) => {
      if (!task) return;
      await api.delete(
        `/workspaces/${workspaceId}/tasks/${task._id}/attachments/${attachmentId}`,
      );
      // Refresh task data
      const { data } = await api.get(
        `/workspaces/${workspaceId}/tasks/${task._id}`,
      );
      await onUpdate?.(task._id, { attachments: data.data.task.attachments });
    },
    [task, workspaceId, onUpdate],
  );

  if (!isOpen) return null;

  if (!task) {
    return (
      <Sheet open={isOpen} onOpenChange={(val) => !val && onClose?.()}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className={cn(
            "w-full p-0 flex flex-col items-center justify-center bg-card/95 backdrop-blur-md",
            isMobile ? "h-full sm:h-auto border-none" : "sm:max-w-2xl border-l border-border/80 shadow-2xl",
          )}
        >
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-medium text-muted-foreground">Memuat detail task...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const canManage = canManageTask({
    task,
    role: memberRole,
    divisions: allDivisions?.length ? allDivisions : divisions,
    userId: currentUserId,
  });

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(val) => !val && onClose?.()}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className={cn(
            "w-full p-0 flex flex-col bg-card/95 backdrop-blur-md",
            isMobile ? "h-full sm:h-auto border-none" : "sm:max-w-2xl border-l border-border/80 shadow-2xl",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-muted/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  priority.color,
                )}
              />
              <SheetTitle className="text-sm font-bold truncate text-foreground">
                {task.title}
              </SheetTitle>
              {task.isArchived && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold border-amber-300 text-amber-600 rounded-md shrink-0"
                >
                  Arsip
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Actions menu — Hanya untuk owner, admin, ketua divisi terkait */}
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/80 shadow-xl">
                    {task.isArchived ? (
                      <DropdownMenuItem
                        onClick={() => onUnarchive?.(task._id)}
                        className="gap-2 text-xs font-semibold"
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        Unarsipkan
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => onArchive?.(task._id)}
                        className="gap-2 text-xs font-semibold"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Arsipkan
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-xs font-semibold text-destructive focus:text-destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <SheetDescription className="sr-only">
            Detail task {task.title}
          </SheetDescription>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="border-b border-border/80 px-5 bg-background/50">
              <TabsList className="h-10 bg-transparent p-0 gap-6">
                <TabsTrigger
                  value="detail"
                  className="h-10 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-bold data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
                >
                  Detail Task
                </TabsTrigger>
                <TabsTrigger
                  value="comment"
                  className="h-10 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-bold data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
                >
                  Komentar
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="h-10 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-bold data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
                >
                  Riwayat Aktivitas
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="detail" className="h-full mt-0 outline-none">
                <ScrollArea className="h-full">
                  <div className="px-5 py-4 pb-8">
                    <TabDetail
                      task={task}
                      columns={columns}
                      members={members}
                      labels={labels}
                      events={events}
                      divisions={divisions}
                      allDivisions={allDivisions}
                      currentUserId={currentUserId}
                      memberRole={memberRole}
                      onUpdate={handleUpdate}
                      onWatch={() => onWatch?.(task._id)}
                      onUnwatch={() => onUnwatch?.(task._id)}
                      onUploadAttachment={handleUploadAttachment}
                      onDeleteAttachment={handleDeleteAttachment}
                      workspaceId={workspaceId}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="comment"
                className="h-full mt-0 outline-none overflow-hidden"
              >
                <TabComment
                  workspaceId={workspaceId}
                  taskId={task._id}
                  currentUserId={currentUserId}
                  members={members}
                />
              </TabsContent>

              <TabsContent
                value="activity"
                className="h-full mt-0 outline-none"
              >
                <ScrollArea className="h-full">
                  <div className="px-5 py-4 pb-8">
                    <TabActivity workspaceId={workspaceId} taskId={task._id} />
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer with meta info */}
          <div className="border-t border-border/80 px-5 py-2.5 bg-muted/20 text-[11px] text-muted-foreground flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3 w-3 text-muted-foreground" />
              Dibuat{" "}
              {task.createdAt &&
                format(new Date(task.createdAt), "d MMM yyyy HH:mm", {
                  locale: localeId,
                })}
            </span>
            {task.createdBy && (
              <span className="font-medium">
                oleh{" "}
                <span className="text-foreground font-semibold">
                  {typeof task.createdBy === "string"
                    ? task.createdBy
                    : task.createdBy.name}
                </span>
              </span>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Hapus Task</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Apakah kamu yakin ingin menghapus task “{task.title}”? Tindakan
              ini permanen dan tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="h-9 rounded-xl text-xs font-semibold">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="h-9 rounded-xl text-xs font-semibold bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                onDelete?.(task._id);
                setDeleteDialogOpen(false);
                onClose?.();
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}