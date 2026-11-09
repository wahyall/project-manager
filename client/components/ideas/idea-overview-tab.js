"use client";

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IDEA_STATUS_CONFIG,
  IDEA_STATUS_ORDER,
} from "@/components/ideas/idea-status-badge";
import { IdeaLabelPicker } from "@/components/ideas/idea-label-picker";
import { AlignLeft, Calendar, Check, Info, Loader2, Lock, Tag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MentionEditor = lazy(() =>
  import("@/components/mention-editor").then((m) => ({
    default: m.MentionEditor,
  })),
);
const MentionReadOnly = lazy(() =>
  import("@/components/mention-editor").then((m) => ({
    default: m.MentionReadOnly,
  })),
);

export function IdeaOverviewTab({
  idea,
  onUpdate,
  members = [],
  workspaceId,
  canManage = false,
}) {
  const [editingDesc, setEditingDesc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const descValueRef = useRef(idea.description || "");
  const descTimerRef = useRef(null);

  useEffect(() => {
    descValueRef.current = idea.description || "";
  }, [idea.description]);

  const saveField = useCallback(
    async (field, value) => {
      setSaving(true);
      try {
        await onUpdate({ [field]: value });
        toast.success("Perubahan tersimpan");
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal menyimpan");
      } finally {
        setSaving(false);
      }
    },
    [onUpdate],
  );

  // Status dikunci selama ide punya Event tertaut.
  const eventCount = idea.eventCount || 0;
  const statusLocked = eventCount > 0;
  const statusReadOnly = statusLocked || !canManage;

  const handleDescChange = useCallback(
    (jsonString) => {
      descValueRef.current = jsonString;
      if (descTimerRef.current) clearTimeout(descTimerRef.current);
      descTimerRef.current = setTimeout(() => {
        if (descValueRef.current !== idea.description) {
          saveField("description", descValueRef.current);
        }
      }, 800);
    },
    [idea.description, saveField],
  );

  const saveDescAndClose = useCallback(() => {
    if (descTimerRef.current) clearTimeout(descTimerRef.current);
    if (descValueRef.current !== idea.description) {
      saveField("description", descValueRef.current);
    }
    setEditingDesc(false);
  }, [idea.description, saveField]);

  return (
    <div className="space-y-4">
      {/* Penjelasan Section */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-2xs backdrop-blur-xs transition-all">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlignLeft className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Penjelasan
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden sm:inline">Menyimpan...</span>
              </span>
            )}
            {editingDesc && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-lg px-2.5 text-xs font-medium gap-1.5 shadow-2xs"
                onClick={saveDescAndClose}
              >
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Selesai
              </Button>
            )}
          </div>
        </div>

        <div className="pt-1">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            }
          >
            {editingDesc ? (
              <div className="rounded-xl border border-border/80 bg-background/80 p-3 shadow-2xs transition-shadow focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-primary/50">
                <MentionEditor
                  key={editorKey}
                  workspaceId={workspaceId}
                  initialContent={idea.description || null}
                  onChange={handleDescChange}
                  className="blocknote-compact"
                />
              </div>
            ) : (
              <div
                onClick={
                  canManage
                    ? () => {
                        setEditingDesc(true);
                        setEditorKey((k) => k + 1);
                      }
                    : undefined
                }
                className={cn(
                  "min-h-[72px] rounded-xl px-3 py-2.5 transition-colors",
                  canManage && "cursor-text hover:bg-muted/40",
                  !idea.description && "border border-dashed border-border/70 flex items-center justify-center text-center",
                )}
              >
                {idea.description ? (
                  <MentionReadOnly content={idea.description} />
                ) : (
                  <p className="text-sm text-muted-foreground/80">
                    Klik di sini untuk menulis penjelasan atau latar belakang ide ini...
                  </p>
                )}
              </div>
            )}
          </Suspense>
        </div>
      </div>

      {/* Detail Section */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-2xs backdrop-blur-xs transition-all space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-border/50">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Info className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Informasi Ide
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Status Ide
            </label>
            {statusReadOnly ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-9.5 w-full cursor-not-allowed items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 text-sm text-muted-foreground shadow-2xs">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          IDEA_STATUS_CONFIG[idea.status]?.dotClass,
                        )}
                      />
                      <span className="font-medium text-foreground/80">
                        {IDEA_STATUS_CONFIG[idea.status]?.label}
                      </span>
                      <Lock className="ml-auto h-3.5 w-3.5 opacity-60" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-xl border-border/80 shadow-md">
                    {statusLocked ? (
                      <>
                        Ditentukan oleh {eventCount} Event terkait. Lepas
                        tautannya dulu untuk mengubah status.
                      </>
                    ) : (
                      "Kamu tidak punya izin mengubah status ide ini."
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Select
                value={idea.status}
                onValueChange={(value) => saveField("status", value)}
              >
                <SelectTrigger className="h-9.5 rounded-xl border-border/80 bg-background/80 shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80 shadow-lg">
                  {IDEA_STATUS_ORDER.filter(
                    (status) => status !== "direalisasi",
                  ).map((status) => (
                    <SelectItem key={status} value={status} className="rounded-lg">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            IDEA_STATUS_CONFIG[status].dotClass,
                          )}
                        />
                        {IDEA_STATUS_CONFIG[status].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Pengusul */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground/70" />
              Pengusul
            </label>
            <div className="flex h-9.5 items-center gap-2.5 rounded-xl border border-border/70 bg-background/50 px-3">
              <Avatar className="h-6 w-6 ring-1 ring-border">
                <AvatarImage src={idea.createdBy?.avatar} alt="" />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                  {idea.createdBy?.name?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium text-foreground">
                {idea.createdBy?.name || "Tidak diketahui"}
              </span>
            </div>
          </div>
        </div>

        {/* Label */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground/70" />
            Label & Kategori
          </label>
          {canManage ? (
            <IdeaLabelPicker
              workspaceId={workspaceId}
              value={(idea.labels || []).map((l) => l._id || l)}
              onChange={(next) => saveField("labels", next)}
            />
          ) : (idea.labels || []).length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {(idea.labels || []).map((label) => (
                <span
                  key={label._id || label}
                  className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium border"
                  style={{
                    backgroundColor: `${label.color}15`,
                    color: label.color,
                    borderColor: `${label.color}30`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Tidak ada label terpasang</p>
          )}
        </div>

        {/* Tanggal dibuat */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
            Waktu Dibuat
          </label>
          <p className="text-xs font-medium text-foreground/80 pl-5">
            {idea.createdAt
              ? format(new Date(idea.createdAt), "dd MMMM yyyy, HH:mm", {
                  locale: localeId,
                })
              : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}
