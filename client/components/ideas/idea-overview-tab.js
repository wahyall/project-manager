"use client";

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlignLeft, Loader2, Lock } from "lucide-react";
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

export function IdeaOverviewTab({ idea, onUpdate, members = [], workspaceId }) {
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

  // Status dikunci selama ide punya Event tertaut. Penguncian ini baru
  // punya arti setelah Task 10, tapi dipasang sekarang supaya perilaku
  // antarmuka tidak berubah lagi belakangan.
  const eventCount = idea.eventCount || 0;
  const statusLocked = eventCount > 0;

  // Deskripsi — auto-save dengan debounce, mengikuti pola tab Ringkasan
  // Event (event-overview-tab.js). MentionEditor tidak menerima prop
  // onBlur, jadi penyimpanan dipicu dari onChange (debounced) dan dari
  // tombol "Selesai" saat menutup mode sunting.
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <AlignLeft className="h-4 w-4 text-muted-foreground" />
            Penjelasan
          </CardTitle>
          <div className="flex items-center gap-2">
            {saving && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            {editingDesc && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={saveDescAndClose}
              >
                Selesai
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            }
          >
            {editingDesc ? (
              <div className="rounded-md border border-input px-4 py-2 transition-shadow focus-within:ring-1 focus-within:ring-ring">
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
                onClick={() => {
                  setEditingDesc(true);
                  setEditorKey((k) => k + 1);
                }}
                className="min-h-[60px] cursor-text rounded-md px-2 py-1 transition-colors hover:bg-muted/50"
              >
                {idea.description ? (
                  <MentionReadOnly content={idea.description} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Klik untuk menambahkan penjelasan
                  </p>
                )}
              </div>
            )}
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Detail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Status
              </p>
              {statusLocked ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-9 w-full cursor-not-allowed items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            IDEA_STATUS_CONFIG[idea.status]?.dotClass,
                          )}
                        />
                        {IDEA_STATUS_CONFIG[idea.status]?.label}
                        <Lock className="ml-auto h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Ditentukan oleh {eventCount} Event terkait. Lepas
                      tautannya dulu untuk mengubah status.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Select
                  value={idea.status}
                  onValueChange={(value) => saveField("status", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IDEA_STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
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

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Pengusul
              </p>
              <div className="flex h-9 items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={idea.createdBy?.avatar} alt="" />
                  <AvatarFallback className="text-[10px]">
                    {idea.createdBy?.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">
                  {idea.createdBy?.name || "Tidak diketahui"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Dibuat</p>
            <p className="text-sm">
              {idea.createdAt
                ? format(new Date(idea.createdAt), "dd MMMM yyyy, HH:mm", {
                    locale: localeId,
                  })
                : "-"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
