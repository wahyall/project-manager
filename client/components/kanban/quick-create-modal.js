"use client";

import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CalendarIcon,
  Loader2,
  Sparkles,
  User,
  AlertTriangle,
  AlignLeft,
  CalendarDays,
  Crown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getInitials } from "./task-card";

// Lazy-load MentionEditor to avoid SSR issues and reduce initial bundle.
const MentionEditor = lazy(() =>
  import("@/components/mention-editor").then((m) => ({
    default: m.MentionEditor,
  })),
);

export function QuickCreateModal({
  open,
  onOpenChange,
  columns,
  members,
  events,
  divisions = [],
  defaultColumnId,
  defaultDueDate,
  defaultDivisionId,
  defaultEventId,
  workspaceId,
  onCreateTask,
  onCreateAndOpen,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState(defaultColumnId || "");
  const [priority, setPriority] = useState("medium");
  const [startDate, setStartDate] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [eventId, setEventId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [creating, setCreating] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const titleInputRef = useRef(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setColumnId(defaultColumnId || columns?.[0]?._id || "");
      setPriority("medium");
      setStartDate(null);
      setDueDate(defaultDueDate ? new Date(defaultDueDate) : null);
      setSelectedAssignees([]);
      setEventId(defaultEventId || "");
      setDivisionId(defaultDivisionId || "");
      setEditorKey((k) => k + 1); // Force fresh editor instance
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [
    open,
    defaultColumnId,
    defaultDueDate,
    defaultDivisionId,
    defaultEventId,
    columns,
  ]);

  const toggleAssignee = (memberId) => {
    setSelectedAssignees((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const handleCreate = async (openDetail = false) => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const taskData = {
        title: title.trim(),
        description: description || "",
        columnId,
        priority,
        startDate: startDate ? startDate.toISOString() : null,
        dueDate: dueDate ? dueDate.toISOString() : null,
        assignees: selectedAssignees,
        eventId: eventId && eventId !== "none" ? eventId : null,
        divisionId: linkedEvent
          ? linkedEventDivisionId || null
          : divisionId || null,
      };
      const task = await onCreateTask(taskData);
      onOpenChange(false);
      if (openDetail && task) {
        onCreateAndOpen?.(task._id);
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setCreating(false);
    }
  };

  // Get member list
  const memberList = (members || []).map((m) => ({
    id: m.userId?._id || m.userId || m._id,
    name: m.userId?.name || m.name || "Member",
  }));

  // Divisi event yang dipilih
  const getEventDivisionId = (evt) => {
    if (!evt?.divisionId) return "";
    return typeof evt.divisionId === "string"
      ? evt.divisionId
      : evt.divisionId._id?.toString() || "";
  };
  const linkedEvent = (events || []).find((e) => e._id === eventId);
  const linkedEventDivisionId = linkedEvent
    ? getEventDivisionId(linkedEvent)
    : "";

  const effectiveDivisionId = linkedEvent
    ? linkedEventDivisionId
    : divisionId;
  const selectedDivisionLeaders = useMemo(() => {
    if (!effectiveDivisionId) return [];
    const div = (divisions || []).find(
      (d) => d._id?.toString() === effectiveDivisionId.toString(),
    );
    if (!div?.members) return [];
    return div.members
      .filter((m) => m.role === "leader")
      .map((m) => {
        const u = m.userId;
        return typeof u === "object" ? u : { _id: u || m._id, name: "Ketua" };
      });
  }, [effectiveDivisionId, divisions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 border-border/80 shadow-2xl bg-card/95 backdrop-blur-xl soft-scrollbar">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Buat Task Baru
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Isi judul dan rincian alur kerja task untuk penugasan tim
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Judul Task <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              ref={titleInputRef}
              placeholder="Contoh: Rancang konsep materi kajian akbar"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCreate(false);
                }
              }}
              className="h-10 rounded-xl bg-background/50 border-border/80 text-sm focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          {/* Description — BlockNote WYSIWYG */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlignLeft className="h-3.5 w-3.5" />
              Deskripsi & Catatan
            </Label>
            <div className="py-2 px-4 rounded-xl border border-border/80 bg-background/50">
              {open && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  }
                >
                  <MentionEditor
                    key={editorKey}
                    workspaceId={workspaceId}
                    initialContent={null}
                    onChange={setDescription}
                    placeholder="Deskripsi task (opsional)... ketik @ untuk mention rekan tim"
                    className="blocknote-compact"
                  />
                </Suspense>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Column */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kolom / Status</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-background/50 border-border/80">
                  <SelectValue placeholder="Pilih kolom" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(columns || []).map((col) => (
                    <SelectItem key={col._id} value={col._id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: col.color }}
                        />
                        <span>{col.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prioritas</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-background/50 border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {[
                    { value: "low", label: "Rendah", color: "bg-slate-400" },
                    { value: "medium", label: "Sedang", color: "bg-amber-400" },
                    { value: "high", label: "Tinggi", color: "bg-orange-500" },
                    {
                      value: "critical",
                      label: "Kritis",
                      color: "bg-red-500",
                    },
                  ].map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", p.color)} />
                        <span>{p.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Mulai</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 rounded-xl justify-start text-left text-xs font-normal bg-background/50 border-border/80",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {startDate
                      ? format(startDate, "d MMM yyyy", { locale: localeId })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tenggat Waktu (Deadline)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 rounded-xl justify-start text-left text-xs font-normal bg-background/50 border-border/80",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {dueDate
                      ? format(dueDate, "d MMM yyyy", { locale: localeId })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penugasan (Assignee)</Label>
            <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-auto min-h-10 rounded-xl justify-start text-left text-xs font-normal flex-wrap gap-1.5 py-2 bg-background/50 border-border/80",
                    selectedAssignees.length === 0 && "text-muted-foreground",
                  )}
                >
                  <User className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {selectedAssignees.length === 0 ? (
                    "Pilih anggota tim"
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedAssignees.map((id) => {
                        const member = memberList.find((m) => m.id === id);
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="text-[10px] h-5 px-1.5 rounded-md font-medium"
                          >
                            {member?.name || "Member"}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 rounded-2xl shadow-xl" align="start">
                <div className="max-h-48 overflow-y-auto space-y-0.5 soft-scrollbar">
                  {memberList.map((member) => (
                    <button
                      key={member.id}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs hover:bg-muted transition-colors text-left",
                        selectedAssignees.includes(member.id) && "bg-muted font-medium",
                      )}
                      onClick={() => toggleAssignee(member.id)}
                    >
                      <Checkbox
                        checked={selectedAssignees.includes(member.id)}
                        className="h-3.5 w-3.5 rounded pointer-events-none"
                      />
                      <Avatar className="h-5 w-5 rounded-full shrink-0">
                        <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{member.name}</span>
                    </button>
                  ))}
                  {memberList.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Belum ada member
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Event (optional) */}
          {(events || []).length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-violet-500" />
                Hubungkan ke Event
                <span className="text-muted-foreground/60 font-normal lowercase">
                  (opsional)
                </span>
              </Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-background/50 border-border/80">
                  <SelectValue placeholder="Tidak terkait event" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">
                    <span className="text-muted-foreground">
                      Tidak terkait event
                    </span>
                  </SelectItem>
                  {(events || []).map((evt) => (
                    <SelectItem key={evt._id} value={evt._id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: evt.color || "#8B5CF6" }}
                        />
                        <span className="truncate">{evt.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Divisi Workspace */}
          {(divisions || []).length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                Divisi Penanggung Jawab
                <span className="text-muted-foreground/60 font-normal lowercase">
                  (opsional)
                </span>
              </Label>
              <Select
                value={
                  linkedEvent
                    ? linkedEventDivisionId || "none"
                    : divisionId || "none"
                }
                onValueChange={(val) =>
                  setDivisionId(val === "none" ? "" : val)
                }
                disabled={!!linkedEvent}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs bg-background/50 border-border/80">
                  <SelectValue placeholder="Tanpa Divisi" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Tanpa Divisi</span>
                  </SelectItem>
                  {(divisions || []).map((div) => (
                    <SelectItem key={div._id} value={div._id.toString()}>
                      <span className="flex items-center gap-2">
                        {div.color && (
                          <span
                            className="h-2 w-2 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: div.color }}
                          />
                        )}
                        <span>{div.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDivisionLeaders.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                  <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>
                    Ketua Divisi:{" "}
                    <strong className="text-foreground font-medium">
                      {selectedDivisionLeaders.map((l) => l.name).join(", ")}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={creating}
            className="rounded-xl text-xs h-9"
          >
            Batal
          </Button>
          <Button
            variant="outline"
            onClick={() => handleCreate(true)}
            disabled={!title.trim() || creating}
            className="rounded-xl text-xs h-9"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Buat & Buka Detail
          </Button>
          <Button
            onClick={() => handleCreate(false)}
            disabled={!title.trim() || creating}
            className="rounded-xl text-xs h-9 shadow-xs"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Buat Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
