"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  lazy,
  Suspense,
} from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventDivisionsSection } from "@/components/events/event-divisions-section";
import { IdeaPicker } from "@/components/ideas/idea-picker";
import {
  CalendarIcon,
  Palette,
  Check,
  Pencil,
  Loader2,
  Sprout,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Lazy-load MentionEditor to avoid SSR issues
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

const EVENT_COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#F97316",
  "#14B8A6",
  "#6366F1",
];

export function EventOverviewTab({
  event,
  onUpdate,
  members = [],
  workspaceId,
  divisions = [],
  readOnly = false,
  canEditStatus = true,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [editorKey, setEditorKey] = useState(0);
  const [speakerEditorKey, setSpeakerEditorKey] = useState(0);
  const descValueRef = useRef(event.description || "");
  const descTimerRef = useRef(null);
  const speakerValueRef = useRef(event.speakerNotes || "");
  const speakerTimerRef = useRef(null);
  const titleRef = useRef(null);

  // Sync title/desc/speaker notes with event prop
  useEffect(() => {
    setTitle(event.title);
    descValueRef.current = event.description || "";
    speakerValueRef.current = event.speakerNotes || "";
  }, [event.title, event.description, event.speakerNotes]);

  const saveField = useCallback(
    async (field, value) => {
      try {
        await onUpdate({ [field]: value });
        toast.success("Perubahan tersimpan");
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal menyimpan");
      }
    },
    [onUpdate],
  );

  const handleTitleSave = () => {
    if (title.trim() && title.trim() !== event.title) {
      saveField("title", title.trim());
    }
    setEditingTitle(false);
  };

  // Description — debounced auto-save
  const handleDescChange = useCallback(
    (jsonString) => {
      descValueRef.current = jsonString;
      if (descTimerRef.current) clearTimeout(descTimerRef.current);
      descTimerRef.current = setTimeout(() => {
        if (descValueRef.current !== event.description) {
          saveField("description", descValueRef.current);
        }
      }, 800);
    },
    [event.description, saveField],
  );

  // Save immediately when leaving edit mode
  const saveDescAndClose = useCallback(() => {
    if (descTimerRef.current) clearTimeout(descTimerRef.current);
    if (descValueRef.current !== event.description) {
      saveField("description", descValueRef.current);
    }
    setEditingDesc(false);
  }, [event.description, saveField]);

  // Catatan pemateri — debounced auto-save
  const handleSpeakerChange = useCallback(
    (jsonString) => {
      speakerValueRef.current = jsonString;
      if (speakerTimerRef.current) clearTimeout(speakerTimerRef.current);
      speakerTimerRef.current = setTimeout(() => {
        if (speakerValueRef.current !== event.speakerNotes) {
          saveField("speakerNotes", speakerValueRef.current);
        }
      }, 800);
    },
    [event.speakerNotes, saveField],
  );

  const saveSpeakerAndClose = useCallback(() => {
    if (speakerTimerRef.current) clearTimeout(speakerTimerRef.current);
    if (speakerValueRef.current !== event.speakerNotes) {
      saveField("speakerNotes", speakerValueRef.current);
    }
    setEditingSpeaker(false);
  }, [event.speakerNotes, saveField]);

  return (
    <div className="space-y-6">
      {/* Title & Description card */}
      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Title */}
          <div className="group">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") {
                      setTitle(event.title);
                      setEditingTitle(false);
                    }
                  }}
                  onBlur={handleTitleSave}
                  maxLength={100}
                  className="text-xl font-bold h-auto py-1 px-2"
                  autoFocus
                />
              </div>
            ) : (
              <div
                className={cn(
                  "flex items-start gap-2 group rounded-md px-2 py-1 -mx-2 -my-1 transition-colors",
                  !readOnly && "cursor-pointer hover:bg-accent/50",
                )}
                onClick={() => {
                  if (!readOnly) setEditingTitle(true);
                }}
              >
                <h2 className="text-xl font-bold flex-1">{event.title}</h2>
                {!readOnly && (
                  <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                Deskripsi
              </label>
              {editingDesc && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={saveDescAndClose}
                >
                  Selesai
                </Button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <div className="py-2 px-6 rounded-md border border-input focus-within:ring-1 focus-within:ring-ring transition-shadow">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      </div>
                    }
                  >
                    <MentionEditor
                      key={editorKey}
                      workspaceId={event.workspaceId}
                      initialContent={event.description || null}
                      onChange={handleDescChange}
                      className="blocknote-compact"
                    />
                  </Suspense>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "rounded-md px-2 py-2 -mx-2 transition-colors min-h-[60px] group",
                  !readOnly && "cursor-pointer hover:bg-accent/50",
                )}
                onClick={() => {
                  if (!readOnly) {
                    setEditorKey((k) => k + 1);
                    setEditingDesc(true);
                  }
                }}
              >
                {event.description ? (
                  <Suspense
                    fallback={
                      <p className="text-sm text-muted-foreground">
                        Loading...
                      </p>
                    }
                  >
                    <MentionReadOnly content={event.description} />
                  </Suspense>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Klik untuk menambahkan deskripsi...
                  </p>
                )}
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Masukan Pemateri / Narasumber */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              <Mic className="h-3.5 w-3.5" />
              Masukan Pemateri / Narasumber
            </CardTitle>
            {!readOnly &&
              (editingSpeaker ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={saveSpeakerAndClose}
                >
                  Selesai
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                  onClick={() => {
                    setSpeakerEditorKey((key) => key + 1);
                    setEditingSpeaker(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          {!readOnly && editingSpeaker ? (
            <div className="rounded-md border border-input px-6 py-2 transition-shadow focus-within:ring-1 focus-within:ring-ring">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  </div>
                }
              >
                <MentionEditor
                  key={speakerEditorKey}
                  workspaceId={event.workspaceId}
                  initialContent={event.speakerNotes || null}
                  onChange={handleSpeakerChange}
                  className="blocknote-compact"
                />
              </Suspense>
            </div>
          ) : (
            <div
              className={cn(
                "min-h-[52px] rounded-md px-2 py-2 -mx-2 transition-colors group",
                !readOnly && "cursor-pointer hover:bg-accent/50",
              )}
              onClick={
                readOnly
                  ? undefined
                  : () => {
                      setSpeakerEditorKey((key) => key + 1);
                      setEditingSpeaker(true);
                    }
              }
            >
              {event.speakerNotes ? (
                <Suspense
                  fallback={
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  }
                >
                  <MentionReadOnly content={event.speakerNotes} />
                </Suspense>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  {readOnly
                    ? "Belum ada masukan pemateri/narasumber."
                    : "Klik untuk menambahkan usulan pemateri, tema, kontak, dan catatan..."}
                </p>
              )}
              {!readOnly && (
                <Pencil className="mt-1 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {event.ideas?.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sprout className="h-3.5 w-3.5" />
            Realisasi dari
          </p>
          <div className="flex flex-wrap gap-2">
            {event.ideas.map((idea) => (
              <Link
                key={idea._id}
                href={`/workspace/${workspaceId}/ideas/${idea._id}`}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
              >
                <Sprout className="h-3 w-3 text-amber-500" />
                <span className="max-w-[220px] truncate">{idea.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Details card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Detail Event
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">
                Tanggal Mulai
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-9 font-normal"
                    disabled={readOnly}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(new Date(event.startDate), "dd MMM yyyy", {
                      locale: localeId,
                    })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(event.startDate)}
                    onSelect={(date) => {
                      if (date) saveField("startDate", date.toISOString());
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">
                Tanggal Selesai
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-9 font-normal"
                    disabled={readOnly}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(new Date(event.endDate), "dd MMM yyyy", {
                      locale: localeId,
                    })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(event.endDate)}
                    onSelect={(date) => {
                      if (date) saveField("endDate", date.toISOString());
                    }}
                    disabled={(date) => date < new Date(event.startDate)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground font-medium">
              Status
            </label>
            <Select
              value={event.status}
              onValueChange={(val) => saveField("status", val)}
              disabled={!canEditStatus}
            >
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Upcoming
                  </span>
                </SelectItem>
                <SelectItem value="ongoing">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Ongoing
                  </span>
                </SelectItem>
                <SelectItem value="completed">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    Completed
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Divisi Workspace */}
          {divisions.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs text-muted-foreground font-medium shrink-0">
                  Divisi
                </label>
                <Select
                  value={
                    event.divisionId
                      ? typeof event.divisionId === "string"
                        ? event.divisionId
                        : event.divisionId._id?.toString()
                      : "none"
                  }
                  onValueChange={(val) =>
                    saveField("divisionId", val === "none" ? null : val)
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-[190px] h-8 text-xs">
                    <SelectValue placeholder="Tanpa Divisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">
                        Tanpa Divisi
                      </span>
                    </SelectItem>
                    {divisions.map((div) => (
                      <SelectItem key={div._id} value={div._id.toString()}>
                        <span className="flex items-center gap-2">
                          {div.color && (
                            <span
                              className="h-2 w-2 rounded-full inline-block"
                              style={{ backgroundColor: div.color }}
                            />
                          )}
                          {div.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />
            </>
          )}

          {/* Color */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Warna Label
            </label>
            <div className="flex gap-1.5">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  disabled={readOnly}
                  onClick={() => saveField("color", c)}
                  className={cn(
                    "h-6 w-6 rounded-full transition-all border-2 flex items-center justify-center",
                    readOnly && "opacity-60 cursor-not-allowed",
                    event.color === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                >
                  {event.color === c && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Relasi Bank Ide */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sprout className="h-3.5 w-3.5" />
              Realisasi dari Ide
            </p>
            <IdeaPicker
              workspaceId={workspaceId}
              value={(event.ideas || []).map((i) => i._id || i)}
              onChange={(next) => saveField("ideas", next)}
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Divisions section */}
      <EventDivisionsSection
        event={event}
        workspaceId={workspaceId}
        members={members}
      />
    </div>
  );
}
