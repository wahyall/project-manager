"use client";

import { useMemo, useRef, useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  CalendarIcon,
  ChevronDown,
  ListChecks,
  Plus,
  Settings2,
  StickyNote,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getInitials } from "./task-card";

const toId = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    return (value._id || value.id || value)?.toString?.() || null;
  }
  return value.toString();
};

const memberOption = (member) => {
  const user = member?.userId || member;
  return {
    id: toId(user) || toId(member?._id),
    name: user?.name || member?.name || "Member",
    avatar: user?.avatar,
    role: member?.role,
  };
};

function SubtaskMetaFields({
  value,
  onChange,
  members = [],
  divisions = [],
  compact = false,
}) {
  const divisionId = toId(value?.divisionId);
  const selectedDivision = (divisions || []).find(
    (division) => division._id?.toString() === divisionId,
  );

  const workspaceMembers = useMemo(
    () => (members || []).map(memberOption).filter((member) => member.id),
    [members],
  );

  const divisionMembers = useMemo(() => {
    if (!selectedDivision) return workspaceMembers;
    return (selectedDivision.members || [])
      .map(memberOption)
      .filter((member) => member.id);
  }, [selectedDivision, workspaceMembers]);

  const assigneeId = toId(value?.assignee);

  const handleDivisionChange = (nextDivision) => {
    const nextDivisionId = nextDivision === "none" ? null : nextDivision;
    const nextDivisionDoc = (divisions || []).find(
      (division) => division._id?.toString() === nextDivisionId,
    );
    const nextOptions = nextDivisionDoc
      ? (nextDivisionDoc.members || [])
          .map(memberOption)
          .filter((member) => member.id)
      : workspaceMembers;
    const stillMember =
      !assigneeId || nextOptions.some((member) => member.id === assigneeId);

    onChange({
      divisionId: nextDivisionId,
      assignee: stillMember ? value?.assignee || null : null,
    });
  };

  return (
    <div className={cn("space-y-1.5", compact && "text-xs")}>
      <div className="grid gap-1.5 sm:grid-cols-2">
        <Select
          value={divisionId || "none"}
          onValueChange={handleDivisionChange}
        >
          <SelectTrigger className="h-8 text-[11px]">
            <SelectValue placeholder="Divisi subtask" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">Tanpa divisi</span>
            </SelectItem>
            {(divisions || []).map((division) => (
              <SelectItem key={division._id} value={division._id.toString()}>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: division.color || "#94A3B8" }}
                  />
                  {division.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={assigneeId || "none"}
          onValueChange={(next) =>
            onChange({ assignee: next === "none" ? null : next })
          }
          disabled={divisionMembers.length === 0}
        >
          <SelectTrigger className="h-8 text-[11px]">
            <SelectValue placeholder="PIC subtask" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">Belum ada PIC</span>
            </SelectItem>
            {divisionMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                <span className="flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="bg-primary/10 text-[7px] text-primary">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[150px] truncate">{member.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-7 gap-1.5 px-2 text-[10px] font-normal",
                !value?.dueDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {value?.dueDate
                ? format(new Date(value.dueDate), "d MMM yyyy", {
                    locale: localeId,
                  })
                : "Deadline"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value?.dueDate ? new Date(value.dueDate) : undefined}
              onSelect={(date) =>
                onChange({ dueDate: date ? date.toISOString() : null })
              }
            />
            {value?.dueDate && (
              <div className="border-t p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-[10px] text-muted-foreground"
                  onClick={() => onChange({ dueDate: null })}
                >
                  Hapus deadline
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Input
          value={value?.notes || ""}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Catatan subtask..."
          maxLength={1000}
          className="h-7 min-w-[150px] flex-1 text-[11px]"
        />
      </div>
    </div>
  );
}

export function SubtaskChecklist({
  subtasks = [],
  onChange,
  members = [],
  divisions = [],
  taskDivisionIds = [],
  currentUserId,
  taskCreatorId,
  memberRole = "member",
  canEdit = true,
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState(null);
  const [newDivisionId, setNewDivisionId] = useState(null);
  const [newDueDate, setNewDueDate] = useState(null);
  const [newNotes, setNewNotes] = useState("");
  const [showAddDetails, setShowAddDetails] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef(null);

  const completed = subtasks.filter((subtask) => subtask.isCompleted).length;
  const total = subtasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const workspaceMembers = useMemo(
    () => (members || []).map(memberOption).filter((member) => member.id),
    [members],
  );

  const availableDivisions = useMemo(() => {
    const involvedIds = new Set(
      (taskDivisionIds || []).map(toId).filter(Boolean),
    );
    if (involvedIds.size === 0) return [];
    return (divisions || []).filter((division) =>
      involvedIds.has(division._id?.toString()),
    );
  }, [divisions, taskDivisionIds]);

  const defaultMembers = useMemo(() => {
    if ((taskDivisionIds || []).length === 0) return workspaceMembers;

    const byId = new Map();
    for (const division of availableDivisions) {
      for (const member of division.members || []) {
        const option = memberOption(member);
        if (option.id && !byId.has(option.id)) byId.set(option.id, option);
      }
    }
    return [...byId.values()];
  }, [availableDivisions, taskDivisionIds, workspaceMembers]);

  const membersForDivision = (divisionId) => {
    if (!divisionId) return defaultMembers;
    const division = availableDivisions.find(
      (item) => item._id?.toString() === divisionId,
    );
    if (!division) return defaultMembers;
    return (division.members || [])
      .map(memberOption)
      .filter((member) => member.id);
  };

  const canToggle = (subtask) => {
    if (!canEdit || memberRole === "guest") return false;
    if (["owner", "admin"].includes(memberRole)) return true;
    if (toId(taskCreatorId) === currentUserId) return true;

    const assigneeId = toId(subtask.assignee);
    if (assigneeId) return assigneeId === currentUserId;
    return true;
  };

  const resetAddForm = () => {
    setNewTitle("");
    setNewAssignee(null);
    setNewDivisionId(null);
    setNewDueDate(null);
    setNewNotes("");
  };

  const addSubtask = () => {
    const title = newTitle.trim();
    if (!title) return;

    const validAssignee = membersForDivision(newDivisionId).some(
      (member) => member.id === newAssignee,
    )
      ? newAssignee
      : null;

    onChange([
      ...subtasks,
      {
        title,
        isCompleted: false,
        assignee: validAssignee,
        divisionId: newDivisionId || null,
        dueDate: newDueDate ? newDueDate.toISOString() : null,
        notes: newNotes.trim(),
        order: subtasks.length,
      },
    ]);

    resetAddForm();
    inputRef.current?.focus();
  };

  const updateSubtask = (index, patch) => {
    onChange(
      subtasks.map((subtask, currentIndex) =>
        currentIndex === index ? { ...subtask, ...patch } : subtask,
      ),
    );
  };

  const toggleComplete = (index) => {
    const subtask = subtasks[index];
    if (!canToggle(subtask)) return;

    const isCompleted = !subtask.isCompleted;
    updateSubtask(index, {
      isCompleted,
      completedBy: isCompleted ? currentUserId : null,
      completedAt: isCompleted ? new Date().toISOString() : null,
    });
  };

  const deleteSubtask = (index) => {
    onChange(subtasks.filter((_, currentIndex) => currentIndex !== index));
  };

  const moveSubtask = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= subtasks.length) return;

    const next = [...subtasks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next.map((subtask, order) => ({ ...subtask, order })));
  };

  const saveTitle = (index) => {
    const title = editTitle.trim();
    if (title) updateSubtask(index, { title });
    setEditingId(null);
    setEditTitle("");
  };

  const displayItems = useMemo(
    () =>
      subtasks
        .map((subtask, index) => ({ subtask, index }))
        .sort((a, b) => {
          if (a.subtask.isCompleted !== b.subtask.isCompleted) {
            return a.subtask.isCompleted ? 1 : -1;
          }
          const orderA = a.subtask.order ?? a.index;
          const orderB = b.subtask.order ?? b.index;
          if (orderA !== orderB) return orderA - orderB;
          return a.index - b.index;
        }),
    [subtasks],
  );

  const resolveAssignee = (subtask) => {
    if (subtask.assignee && typeof subtask.assignee === "object") {
      return subtask.assignee;
    }
    const id = toId(subtask.assignee);
    return workspaceMembers.find((member) => member.id === id) || null;
  };

  const resolveDivision = (subtask) => {
    if (subtask.divisionId && typeof subtask.divisionId === "object") {
      return subtask.divisionId;
    }
    const id = toId(subtask.divisionId);
    return (
      (divisions || []).find(
        (division) => division._id?.toString() === id,
      ) || null
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Checklist
          </h4>
          <Badge variant="secondary" className="h-5 text-[10px]">
            {completed}/{total}
          </Badge>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">
          {percent}%
        </span>
      </div>

      <Progress value={percent} className="h-1.5" />

      {canEdit && (
        <div className="space-y-2 rounded-md border bg-muted/20 p-2">
          <div className="flex items-center gap-1.5">
            <Input
              ref={inputRef}
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSubtask();
                }
              }}
              placeholder="Tambah checklist..."
              maxLength={200}
              className="h-8 text-xs"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 px-2.5"
              onClick={addSubtask}
              disabled={!newTitle.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <button
            type="button"
            className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowAddDetails((value) => !value)}
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showAddDetails && "rotate-180",
              )}
            />
            {showAddDetails ? "Sembunyikan detail" : "Atur PIC, divisi, deadline"}
          </button>

          {showAddDetails && (
            <SubtaskMetaFields
              value={{
                assignee: newAssignee,
                divisionId: newDivisionId,
                dueDate: newDueDate ? newDueDate.toISOString() : null,
                notes: newNotes,
              }}
              onChange={(patch) => {
                if (patch.assignee !== undefined) setNewAssignee(patch.assignee);
                if (patch.divisionId !== undefined)
                  setNewDivisionId(patch.divisionId);
                if (patch.dueDate !== undefined) {
                  setNewDueDate(
                    patch.dueDate ? new Date(patch.dueDate) : null,
                  );
                }
                if (patch.notes !== undefined) setNewNotes(patch.notes);
              }}
              members={defaultMembers}
              divisions={availableDivisions}
              compact
            />
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {displayItems.map(({ subtask, index }) => {
          const assignee = resolveAssignee(subtask);
          const division = resolveDivision(subtask);
          const dueDate = subtask.dueDate ? new Date(subtask.dueDate) : null;
          const overdue =
            dueDate && !subtask.isCompleted && isPast(dueDate) && !isToday(dueDate);

          return (
            <div
              key={subtask._id || index}
              className={cn(
                "group flex items-start gap-2 rounded-md border px-2 py-1.5 transition-colors",
                subtask.isCompleted && "bg-muted/30",
              )}
            >
              <Checkbox
                checked={subtask.isCompleted === true}
                disabled={!canToggle(subtask)}
                onCheckedChange={() => toggleComplete(index)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
              />

              <div className="min-w-0 flex-1 space-y-1">
                {editingId === index ? (
                  <Input
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    onBlur={() => saveTitle(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveTitle(index);
                      if (event.key === "Escape") {
                        setEditingId(null);
                        setEditTitle("");
                      }
                    }}
                    className="h-7 text-xs"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "block w-full text-left text-xs leading-snug transition-colors hover:text-primary",
                      subtask.isCompleted &&
                        "text-muted-foreground line-through",
                    )}
                    onDoubleClick={() => {
                      if (!canEdit) return;
                      setEditingId(index);
                      setEditTitle(subtask.title);
                    }}
                    title="Klik dua kali untuk mengubah judul"
                  >
                    {subtask.title}
                  </button>
                )}

                <div className="flex flex-wrap items-center gap-1">
                  {assignee && (
                    <Badge
                      variant="secondary"
                      className="h-5 gap-1 px-1.5 text-[9px] font-normal"
                    >
                      <Avatar className="h-3.5 w-3.5">
                        <AvatarFallback className="bg-primary/10 text-[7px] text-primary">
                          {getInitials(assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-[90px] truncate">
                        {assignee.name}
                      </span>
                    </Badge>
                  )}
                  {division && (
                    <Badge
                      variant="outline"
                      className="h-5 gap-1 px-1.5 text-[9px] font-normal"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: division.color || "#94A3B8",
                        }}
                      />
                      <span className="max-w-[100px] truncate">
                        {division.name}
                      </span>
                    </Badge>
                  )}
                  {dueDate && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 gap-1 px-1.5 text-[9px] font-normal",
                        overdue &&
                          "border-red-300 text-red-600 dark:text-red-400",
                        !overdue &&
                          isToday(dueDate) &&
                          "border-amber-300 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      <CalendarIcon className="h-2.5 w-2.5" />
                      {format(dueDate, "d MMM", { locale: localeId })}
                    </Badge>
                  )}
                  {subtask.notes && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <StickyNote className="h-2.5 w-2.5" />
                          Catatan
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[260px] whitespace-pre-wrap text-xs">
                        {subtask.notes}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {subtask.notes && (
                  <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                    {subtask.notes}
                  </p>
                )}
              </div>

              {canEdit && (
                <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Atur detail subtask"
                      >
                        <Settings2 className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-2" align="end">
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        <Settings2 className="h-3 w-3" />
                        Detail Subtask
                      </div>
                      <SubtaskMetaFields
                        value={subtask}
                        onChange={(patch) => updateSubtask(index, patch)}
                        members={defaultMembers}
                        divisions={availableDivisions}
                      />
                      <Separator className="my-2" />
                      <p className="text-[10px] text-muted-foreground">
                        Perubahan tersimpan otomatis.
                      </p>
                    </PopoverContent>
                  </Popover>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveSubtask(index, -1)}
                    disabled={index === 0}
                    title="Naikkan"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveSubtask(index, 1)}
                    disabled={index === subtasks.length - 1}
                    title="Turunkan"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteSubtask(index)}
                    title="Hapus"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {total === 0 && (
          <div className="rounded-md border border-dashed px-3 py-5 text-center">
            <ListChecks className="mx-auto mb-1 h-5 w-5 text-muted-foreground/60" />
            <p className="text-[11px] text-muted-foreground">
              Belum ada checklist. Tambahkan langkah kecil agar progres task
              lebih jelas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
