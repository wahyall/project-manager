"use client";

import { useState, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CalendarIcon,
  CalendarDays,
  User,
  Tag,
  AlertTriangle,
  Eye,
  EyeOff,
  Link2,
  Lock,
  Columns3,
  AlignLeft,
  Loader2,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getInitials, PRIORITY_CONFIG } from "./task-card";
import { SubtaskChecklist } from "./subtask-checklist";
import { CoordinationSection } from "./coordination-section";
import { AttachmentSection } from "./attachment-section";
import { canManageTask } from "@/lib/permissions";

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
// Static import for the helper
import { isBlockNoteEmpty } from "@/components/blocknote-editor";

// ── Field Row component ──────────────────────────────
function FieldRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex items-center gap-2 w-28 shrink-0 pt-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

const toIdString = (value) => {
  if (!value) return null;
  return (value._id || value)?.toString?.() || String(value);
};

// Kirim hanya field yang dikenal API. Subtask dari server membawa assignee dan
// divisionId dalam bentuk objek ter-populate; jangan kirim objek itu kembali.
const serializeSubtasks = (subtasks = []) =>
  subtasks.map((subtask) => ({
    _id: subtask._id,
    title: subtask.title,
    isCompleted: subtask.isCompleted === true,
    assignee: toIdString(subtask.assignee),
    divisionId: toIdString(subtask.divisionId),
    dueDate: subtask.dueDate || null,
    notes: subtask.notes || "",
    order: subtask.order,
  }));

export function TabDetail({
  task,
  columns,
  members,
  labels,
  events,
  divisions = [],
  allDivisions = [],
  currentUserId,
  memberRole = "member",
  onUpdate,
  onWatch,
  onUnwatch,
  onUploadAttachment,
  onDeleteAttachment,
  workspaceId,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descEditorKey, setDescEditorKey] = useState(0);
  const descValueRef = useRef(task.description || "");
  const descTimerRef = useRef(null);

  const isWatching = (task.watchers || []).some(
    (w) => (typeof w === "string" ? w : w._id) === currentUserId,
  );

  // Title save
  const saveTitle = useCallback(() => {
    if (titleValue.trim() && titleValue.trim() !== task.title) {
      onUpdate({ title: titleValue.trim() });
    }
    setEditingTitle(false);
  }, [titleValue, task.title, onUpdate]);

  // Description — debounced auto-save
  const handleDescChange = useCallback(
    (jsonString, extractedMentions) => {
      descValueRef.current = jsonString;
      if (descTimerRef.current) clearTimeout(descTimerRef.current);
      descTimerRef.current = setTimeout(() => {
        if (descValueRef.current !== task.description) {
          onUpdate({ description: descValueRef.current });
        }
      }, 800);
    },
    [task.description, onUpdate],
  );

  // Save immediately when leaving edit mode
  const saveDescAndClose = useCallback(() => {
    if (descTimerRef.current) clearTimeout(descTimerRef.current);
    if (descValueRef.current !== task.description) {
      onUpdate({ description: descValueRef.current });
    }
    setEditingDesc(false);
  }, [task.description, onUpdate]);

  // Member list
  const memberList = (members || []).map((m) => ({
    id: m.userId?._id || m.userId || m._id,
    name: m.userId?.name || m.name || "Member",
  }));

  // Resolve current division & leader(s)
  const selectedDivision = useMemo(() => {
    if (!task.divisionId) return null;
    const divId =
      typeof task.divisionId === "object"
        ? (task.divisionId._id || task.divisionId.id)?.toString()
        : task.divisionId.toString();
    const found = (divisions || []).find((d) => d._id?.toString() === divId);
    if (found) return found;
    return typeof task.divisionId === "object" ? task.divisionId : null;
  }, [task.divisionId, divisions]);

  const divisionLeaders = useMemo(() => {
    if (!selectedDivision?.members) return [];
    return selectedDivision.members
      .filter((m) => m.role === "leader")
      .map((m) => {
        const u = m.userId;
        if (u && typeof u === "object") return u;
        return { _id: u || m._id, name: "Ketua" };
      });
  }, [selectedDivision]);

  const creatorId =
    typeof task.createdBy === "object"
      ? task.createdBy?._id
      : task.createdBy;

  const taskDivisionIds = useMemo(
    () =>
      [
        ...new Set(
          [task.divisionId, ...(task.divisionIds || [])]
            .map((value) =>
              value
                ? (value._id || value)?.toString?.() || value.toString()
                : null,
            )
            .filter(Boolean),
        ),
      ],
    [task.divisionId, task.divisionIds],
  );

  const canManageCoordination = useMemo(() => {
    if (["owner", "admin"].includes(memberRole)) return true;
    if (creatorId && creatorId.toString() === currentUserId) return true;

    return (divisions || []).some((division) => {
      if (!taskDivisionIds.includes(division._id?.toString())) return false;
      return (division.members || []).some((member) => {
        const memberId = member.userId?._id || member.userId;
        return (
          member.role === "leader" &&
          memberId?.toString() === currentUserId
        );
      });
    });
  }, [
    creatorId,
    currentUserId,
    divisions,
    memberRole,
    taskDivisionIds,
  ]);

  const canManage = useMemo(() => {
    return canManageTask({
      task,
      role: memberRole,
      divisions: allDivisions?.length ? allDivisions : divisions,
      userId: currentUserId,
    });
  }, [task, memberRole, allDivisions, divisions, currentUserId]);

  // Current assignee IDs
  const assigneeIds = (task.assignees || []).map((a) =>
    typeof a === "string" ? a : a._id,
  );

  const toggleAssignee = (memberId) => {
    const newAssignees = assigneeIds.includes(memberId)
      ? assigneeIds.filter((id) => id !== memberId)
      : [...assigneeIds, memberId];
    onUpdate({ assignees: newAssignees });
  };

  // Current label IDs
  const labelIds = (task.labels || []).map((l) =>
    typeof l === "string" ? l : l._id,
  );

  const toggleLabel = (labelId) => {
    const newLabels = labelIds.includes(labelId)
      ? labelIds.filter((id) => id !== labelId)
      : [...labelIds, labelId];
    onUpdate({ labels: newLabels });
  };

  return (
    <div className="space-y-2 py-1">
      {/* ── Title ──────────────────────────────────── */}
      <div>
        {editingTitle ? (
          <Input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setTitleValue(task.title);
                setEditingTitle(false);
              }
            }}
            className="text-base font-bold h-auto py-1.5 px-3 rounded-xl border-border/80"
            autoFocus
          />
        ) : (
          <h2
            className={cn(
              "text-base font-bold text-foreground rounded-xl px-2.5 py-1.5 -mx-1 transition-colors",
              canManage && "cursor-pointer hover:bg-muted/40",
            )}
            onClick={() => {
              if (!canManage) return;
              setTitleValue(task.title);
              setEditingTitle(true);
            }}
          >
            {task.title}
          </h2>
        )}
      </div>

      {/* ── Watch button ──────────────────────────── */}
      <div className="flex items-center gap-2 pt-1 pb-2">
        <Button
          variant={isWatching ? "secondary" : "outline"}
          size="sm"
          className="h-7 gap-1.5 text-xs font-semibold rounded-lg border-border/80"
          onClick={() => (isWatching ? onUnwatch?.() : onWatch?.())}
        >
          {isWatching ? (
            <>
              <Eye className="h-3.5 w-3.5 text-primary" /> Watching
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Watch
            </>
          )}
        </Button>
        {task.isArchived && (
          <Badge
            variant="outline"
            className="text-[10px] font-bold border-amber-300 text-amber-600 rounded-md"
          >
            Diarsipkan
          </Badge>
        )}
      </div>

      <Separator className="my-2 opacity-50" />

      {/* ── Fields ─────────────────────────────────── */}
      <div className="space-y-1">
        {/* Status / Column */}
        <FieldRow icon={Columns3} label="Status">
          <Select
            value={
              typeof task.columnId === "string"
                ? task.columnId
                : task.columnId?.toString()
            }
            onValueChange={(val) => onUpdate({ columnId: val })}
            disabled={memberRole === "guest"}
          >
            <SelectTrigger className="h-8 text-xs font-semibold w-auto min-w-[140px] rounded-xl border-border/80 bg-background/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/80 shadow-xl">
              {(columns || []).map((col) => (
                <SelectItem key={col._id} value={col._id} className="text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    {col.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {/* Priority */}
        <FieldRow icon={AlertTriangle} label="Prioritas">
          <Select
            value={task.priority}
            onValueChange={(val) => onUpdate({ priority: val })}
            disabled={!canManage}
          >
            <SelectTrigger className="h-8 text-xs font-semibold w-auto min-w-[120px] rounded-xl border-border/80 bg-background/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/80 shadow-xl">
              {[
                { value: "low", label: "Low", color: "bg-slate-400" },
                { value: "medium", label: "Medium", color: "bg-amber-400" },
                { value: "high", label: "High", color: "bg-orange-500" },
                { value: "critical", label: "Critical", color: "bg-red-500" },
              ].map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", p.color)} />
                    {p.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {/* Assignees */}
        <FieldRow icon={User} label="Assignee">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto min-h-8 px-2.5 text-xs font-medium flex-wrap gap-1.5 justify-start rounded-xl border border-border/80 bg-background/80 hover:bg-muted/40"
                disabled={!canManage}
              >
                {assigneeIds.length === 0 ? (
                  <span className="text-muted-foreground">
                    Tambah assignee...
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(task.assignees || []).map((a) => {
                      const user =
                        typeof a === "string" ? { _id: a, name: "?" } : a;
                      return (
                        <Badge
                          key={user._id}
                          variant="secondary"
                          className="text-[10px] font-semibold h-5.5 gap-1 px-2 rounded-md"
                        >
                          <Avatar className="h-3.5 w-3.5 rounded-sm">
                            <AvatarFallback className="text-[7px] font-bold bg-primary/10 text-primary">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          {user.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl" align="start">
              <p className="text-[10px] font-bold text-muted-foreground px-1 py-1 uppercase tracking-wider">
                Pilih Assignee
              </p>
              <Separator className="my-1.5" />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {memberList.map((member) => (
                  <button
                    key={member.id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold hover:bg-accent transition-colors",
                      assigneeIds.includes(member.id) && "bg-accent/80",
                    )}
                    onClick={() => toggleAssignee(member.id)}
                  >
                    <Checkbox
                      checked={assigneeIds.includes(member.id)}
                      className="h-3.5 w-3.5 pointer-events-none rounded-sm"
                    />
                    <Avatar className="h-5 w-5 rounded-md">
                      <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs">{member.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </FieldRow>

        {/* Labels */}
        <FieldRow icon={Tag} label="Label">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto min-h-8 px-2.5 text-xs font-medium flex-wrap gap-1.5 justify-start rounded-xl border border-border/80 bg-background/80 hover:bg-muted/40"
                disabled={!canManage}
              >
                {labelIds.length === 0 ? (
                  <span className="text-muted-foreground">Tambah label...</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(task.labels || []).map((l) => {
                      const label =
                        typeof l === "string"
                          ? { _id: l, name: "?", color: "#6B7280" }
                          : l;
                      return (
                        <Badge
                          key={label._id}
                          variant="outline"
                          className="text-[10px] font-semibold h-5.5 gap-1 px-2 rounded-md"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl" align="start">
              <p className="text-[10px] font-bold text-muted-foreground px-1 py-1 uppercase tracking-wider">
                Pilih Label
              </p>
              <Separator className="my-1.5" />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {(labels || []).map((label) => (
                  <button
                    key={label._id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold hover:bg-accent transition-colors",
                      labelIds.includes(label._id) && "bg-accent/80",
                    )}
                    onClick={() => toggleLabel(label._id)}
                  >
                    <Checkbox
                      checked={labelIds.includes(label._id)}
                      className="h-3.5 w-3.5 pointer-events-none rounded-sm"
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="truncate text-xs">{label.name}</span>
                  </button>
                ))}
                {(labels || []).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Belum ada label
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </FieldRow>

        {/* Start Date */}
        <FieldRow icon={CalendarIcon} label="Start Date">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 text-xs font-semibold justify-start px-2.5 rounded-xl border border-border/80 bg-background/80 hover:bg-muted/40",
                  !task.startDate && "text-muted-foreground font-normal",
                )}
                disabled={!canManage}
              >
                {task.startDate
                  ? format(new Date(task.startDate), "d MMMM yyyy", {
                      locale: localeId,
                    })
                  : "Belum ditentukan"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl border-border/80 shadow-2xl" align="start">
              <Calendar
                mode="single"
                selected={task.startDate ? new Date(task.startDate) : undefined}
                onSelect={(date) =>
                  onUpdate({ startDate: date ? date.toISOString() : null })
                }
              />
            </PopoverContent>
          </Popover>
        </FieldRow>

        {/* Due Date */}
        <FieldRow icon={CalendarIcon} label="Due Date">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 text-xs font-semibold justify-start px-2.5 rounded-xl border border-border/80 bg-background/80 hover:bg-muted/40",
                  !task.dueDate && "text-muted-foreground font-normal",
                )}
                disabled={!canManage}
              >
                {task.dueDate
                  ? format(new Date(task.dueDate), "d MMMM yyyy", {
                      locale: localeId,
                    })
                  : "Belum ditentukan"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl border-border/80 shadow-2xl" align="start">
              <Calendar
                mode="single"
                selected={task.dueDate ? new Date(task.dueDate) : undefined}
                onSelect={(date) =>
                  onUpdate({ dueDate: date ? date.toISOString() : null })
                }
              />
            </PopoverContent>
          </Popover>
        </FieldRow>

        {/* Event (optional) */}
        <FieldRow icon={CalendarDays} label="Event">
          <Select
            value={
              task.eventId
                ? typeof task.eventId === "string"
                  ? task.eventId
                  : task.eventId._id
                : "none"
            }
            onValueChange={(val) =>
              onUpdate({ eventId: val === "none" ? null : val })
            }
          >
            <SelectTrigger className="h-8 text-xs font-semibold w-auto min-w-[160px] rounded-xl border-border/80 bg-background/80">
              <SelectValue placeholder="Tidak terkait event" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/80 shadow-xl">
              <SelectItem value="none">
                <span className="text-muted-foreground">
                  Tidak terkait event
                </span>
              </SelectItem>
              {(events || []).map((evt) => (
                <SelectItem key={evt._id} value={evt._id} className="text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: evt.color || "#8B5CF6" }}
                    />
                    <span className="truncate">{evt.title}</span>
                    {evt.status && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-bold h-4 px-1 ml-auto shrink-0 rounded",
                          evt.status === "ongoing" &&
                            "border-green-300 text-green-600 bg-green-500/10",
                          evt.status === "upcoming" &&
                            "border-blue-300 text-blue-600 bg-blue-500/10",
                          evt.status === "completed" &&
                            "border-gray-300 text-gray-500 bg-muted",
                        )}
                      >
                        {evt.status}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        {/* Divisi Workspace */}
        {(divisions || []).length > 0 && (
          <FieldRow icon={Columns3} label="Divisi Utama">
            <Select
              value={
                task.divisionId
                  ? typeof task.divisionId === "string"
                    ? task.divisionId
                    : task.divisionId._id
                  : "none"
              }
              onValueChange={(val) => {
                const nextPrimary = val === "none" ? null : val;
                const oldPrimary = task.divisionId
                  ? (task.divisionId._id || task.divisionId)?.toString?.()
                  : null;
                const currentIds = [
                  ...(task.divisionIds || []).map((division) =>
                    (division._id || division)?.toString?.(),
                  ),
                  oldPrimary,
                ].filter(Boolean);

                const divisionIds = nextPrimary
                  ? [
                      nextPrimary,
                      ...new Set(
                        currentIds.filter((id) => id !== nextPrimary),
                      ),
                    ]
                  : [];
                const nextDivisionIdSet = new Set(divisionIds);
                const divisionPics = nextPrimary
                  ? (task.divisionPics || []).filter((pic) => {
                      const picDivision =
                        pic.divisionId?._id || pic.divisionId;
                      return nextDivisionIdSet.has(
                        picDivision?.toString(),
                      );
                    })
                  : [];

                onUpdate({
                  divisionId: nextPrimary,
                  divisionIds,
                  divisionPics,
                });
              }}
              disabled={!!task.eventId || !canManageCoordination}
            >
              <SelectTrigger className="h-8 text-xs font-semibold w-auto min-w-[160px] rounded-xl border-border/80 bg-background/80">
                <SelectValue placeholder="Tanpa Divisi" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/80 shadow-xl">
                <SelectItem value="none">
                  <span className="text-muted-foreground">Tanpa Divisi</span>
                </SelectItem>
                {(divisions || []).map((div) => (
                  <SelectItem key={div._id} value={div._id.toString()} className="text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      {div.color && (
                        <span
                          className="h-2 w-2 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: div.color }}
                        />
                      )}
                      {div.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        )}
        {task.eventId && (divisions || []).length > 0 && (
          <p className="-mt-1 text-[11px] text-muted-foreground pl-31">
            Divisi utama mengikuti event terkait.
          </p>
        )}

        {/* Ketua Divisi */}
        {divisionLeaders.length > 0 && (
          <FieldRow icon={Crown} label="Ketua Divisi">
            <div className="flex flex-wrap items-center gap-1.5 py-0.5">
              {divisionLeaders.map((leader) => (
                <Badge
                  key={leader._id}
                  variant="secondary"
                  className="text-xs h-6 gap-1 px-2.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 rounded-lg"
                >
                  <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="font-semibold">{leader.name}</span>
                </Badge>
              ))}
            </div>
          </FieldRow>
        )}

        {/* Dependencies (read-only display) */}
        {task.blockedBy && task.blockedBy.length > 0 && (
          <FieldRow icon={Lock} label="Diblokir oleh">
            <div className="flex flex-wrap gap-1.5">
              {task.blockedBy.map((dep) => {
                const d =
                  typeof dep === "string" ? { _id: dep, title: "Task" } : dep;
                return (
                  <Badge
                    key={d._id}
                    variant="outline"
                    className="text-[10px] font-semibold h-5.5 gap-1 px-2 rounded-md border-amber-500/30 text-amber-600 bg-amber-500/10"
                  >
                    <Lock className="h-2.5 w-2.5" />
                    {d.title}
                  </Badge>
                );
              })}
            </div>
          </FieldRow>
        )}
      </div>

      <CoordinationSection
        task={task}
        divisions={allDivisions.length > 0 ? allDivisions : divisions}
        onUpdate={onUpdate}
        canManage={canManageCoordination}
        readOnly={memberRole === "guest"}
      />

      <Separator className="my-2 opacity-50" />

      {/* ── Description (BlockNote WYSIWYG) ────────── */}
      <div className="py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlignLeft className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Deskripsi Task
            </h4>
          </div>
          {editingDesc && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] font-semibold px-2.5 rounded-lg text-primary hover:bg-primary/10"
              onClick={saveDescAndClose}
            >
              Selesai Edit
            </Button>
          )}
        </div>

        {editingDesc ? (
          <div className="rounded-2xl border border-border/80 bg-background/80 focus-within:ring-2 focus-within:ring-primary/20 transition-all py-3 px-5 shadow-2xs">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-xs font-medium">Memuat editor...</span>
                </div>
              }
            >
              <MentionEditor
                key={`desc-${task._id}-${descEditorKey}`}
                workspaceId={workspaceId}
                initialContent={task.description || null}
                onChange={handleDescChange}
                className="blocknote-compact"
              />
            </Suspense>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl border border-border/60 bg-background/50 p-3.5 min-h-[50px] transition-all",
              canManage && "cursor-pointer hover:bg-muted/40 hover:border-border",
            )}
            onClick={() => {
              if (!canManage) return;
              descValueRef.current = task.description || "";
              setDescEditorKey((k) => k + 1);
              setEditingDesc(true);
            }}
          >
            {!isBlockNoteEmpty(task.description) ? (
              <Suspense
                fallback={
                  <div className="text-xs text-muted-foreground">
                    Memuat tampilan...
                  </div>
                }
              >
                <MentionReadOnly
                  content={task.description}
                  className="blocknote-compact"
                />
              </Suspense>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Klik untuk menambahkan deskripsi atau catatan task...
              </span>
            )}
          </div>
        )}
      </div>

      <Separator className="my-2 opacity-50" />

      {/* ── Subtasks ───────────────────────────────── */}
      <div className="py-2">
        <SubtaskChecklist
          subtasks={task.subtasks || []}
          onChange={(subtasks) =>
            onUpdate({ subtasks: serializeSubtasks(subtasks) })
          }
          members={members}
          divisions={allDivisions.length > 0 ? allDivisions : divisions}
          taskDivisionIds={taskDivisionIds}
          currentUserId={currentUserId}
          taskCreatorId={creatorId}
          memberRole={memberRole}
          canEdit={canManage}
        />
      </div>

      <Separator className="my-2 opacity-50" />

      {/* ── Attachments ────────────────────────────── */}
      <div className="py-2">
        <AttachmentSection
          attachments={task.attachments || []}
          workspaceId={workspaceId}
          taskId={task._id}
          onUpload={onUploadAttachment}
          onDelete={onDeleteAttachment}
        />
      </div>
    </div>
  );
}