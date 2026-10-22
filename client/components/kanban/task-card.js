"use client";

import { memo, useMemo } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Lock,
  MessageSquare,
  Paperclip,
  Eye,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Priority config
const PRIORITY_CONFIG = {
  low: { color: "bg-slate-400", label: "Low", border: "border-l-slate-400" },
  medium: {
    color: "bg-amber-400",
    label: "Medium",
    border: "border-l-amber-400",
  },
  high: {
    color: "bg-orange-500",
    label: "High",
    border: "border-l-orange-500",
  },
  critical: {
    color: "bg-red-500",
    label: "Critical",
    border: "border-l-red-500",
  },
};

// Helper: format due date with smart labels
function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const overdue = isPast(date) && !isToday(date);
  const today = isToday(date);
  const tomorrow = isTomorrow(date);

  let text;
  if (today) text = "Hari ini";
  else if (tomorrow) text = "Besok";
  else if (overdue) text = format(date, "d MMM", { locale: localeId });
  else text = format(date, "d MMM", { locale: localeId });

  return { text, overdue, today };
}

// Helper: get initials from name
function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Subtask progress mini component ───────────────
function SubtaskProgress({ subtasks }) {
  if (!subtasks || subtasks.length === 0) return null;
  const completed = subtasks.filter((s) => s.isCompleted).length;
  const total = subtasks.length;
  const percent = Math.round((completed / total) * 100);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" />
          <span className="font-medium">
            {completed}/{total}
          </span>
          <Progress value={percent} className="h-1 w-10" />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {completed} dari {total} subtask selesai
      </TooltipContent>
    </Tooltip>
  );
}

// ── Assignee avatars stack ─────────────────────────
function AssigneeStack({ assignees, max = 3 }) {
  if (!assignees || assignees.length === 0) return null;
  const visible = assignees.slice(0, max);
  const remaining = assignees.length - max;

  return (
    <div className="flex -space-x-1.5">
      {visible.map((user) => (
        <Tooltip key={user._id}>
          <TooltipTrigger asChild>
            <Avatar className="h-6 w-6 border-2 border-background ring-0">
              <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{user.name}</TooltipContent>
        </Tooltip>
      ))}
      {remaining > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
              +{remaining}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {assignees
              .slice(max)
              .map((u) => u.name)
              .join(", ")}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// ── PIC per division avatars stack ──────────────────
function PicStack({ pics, max = 3 }) {
  if (!pics || pics.length === 0) return null;
  const visible = pics.slice(0, max);
  const remaining = pics.length - max;

  return (
    <div className="flex -space-x-1.5">
      {visible.map(({ user, divisionNames = [] }) => (
        <Tooltip key={user._id}>
          <TooltipTrigger asChild>
            <Avatar className="h-6 w-6 border-2 border-background ring-1 ring-amber-400/50">
              <AvatarFallback className="text-[9px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>
            PIC {divisionNames.length > 0 ? `${divisionNames.join(", ")}: ` : ""}
            {user.name}
          </TooltipContent>
        </Tooltip>
      ))}
      {remaining > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-amber-500/10 text-[9px] font-medium text-amber-700 dark:text-amber-400">
              +{remaining}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {pics
              .slice(max)
              .map(({ user, divisionNames = [] }) =>
                divisionNames.length > 0
                  ? `${user.name} (${divisionNames.join(", ")})`
                  : user.name,
              )
              .join(", ")}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// ── Main TaskCard component ────────────────────────
function TaskCardInner({
  task,
  index,
  isSelected,
  onToggleSelect,
  onClick,
  isDependencyBlocked,
  isDraggable = true,
}) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const dueInfo = useMemo(() => formatDueDate(task.dueDate), [task.dueDate]);
  const commentCount = task.commentCount || 0;
  const attachmentCount = (task.attachments || []).length;

  const divisionList = useMemo(() => {
    const source = task.divisionIds?.length
      ? task.divisionIds
      : [task.divisionId];
    const seen = new Set();
    return (source || [])
      .filter(Boolean)
      .map((raw) => {
        const division =
          typeof raw === "object"
            ? raw
            : { _id: raw, name: "Divisi", color: null };
        const id = (division._id || division)?.toString?.();
        if (!id || seen.has(id)) return null;
        seen.add(id);
        return division;
      })
      .filter(Boolean);
  }, [task.divisionId, task.divisionIds]);

  const picList = useMemo(() => {
    const byUser = new Map();
    for (const pic of task.divisionPics || []) {
      const user = typeof pic.userId === "object" ? pic.userId : null;
      if (!user?._id) continue;
      const divisionId =
        typeof pic.divisionId === "object"
          ? pic.divisionId._id
          : pic.divisionId;
      const division = divisionList.find(
        (item) => item._id?.toString() === divisionId?.toString(),
      );
      const userId = user._id.toString();
      const entry = byUser.get(userId) || { user, divisionNames: [] };
      if (division?.name && !entry.divisionNames.includes(division.name)) {
        entry.divisionNames.push(division.name);
      }
      byUser.set(userId, entry);
    }
    return [...byUser.values()];
  }, [divisionList, task.divisionPics]);

  const hasCoordination =
    divisionList.length > 1 ||
    picList.length > 0 ||
    !!task.coordination?.constraints ||
    !!task.coordination?.helpNeeded ||
    !!task.coordination?.followUp;

  const renderCard = (provided = {}, snapshot = {}) => (
    <div
      ref={provided.innerRef}
      {...(provided.draggableProps || {})}
      {...(provided.dragHandleProps || {})}
      className={cn(
        "group relative rounded-lg border bg-card p-3 shadow-sm transition-all duration-200",
        "border-l-[3px]",
        priority.border,
        "hover:shadow-md hover:border-border/80",
        snapshot.isDragging &&
          "shadow-xl rotate-[2deg] scale-[1.02] ring-2 ring-primary/20",
        isSelected && "ring-2 ring-primary bg-primary/5",
        task.isArchived && "opacity-60",
      )}
      onClick={(e) => {
        // Don't open detail if clicking checkbox
        if (e.target.closest("[data-select-checkbox]")) return;
        onClick?.(task._id);
      }}
    >
      {/* Selection checkbox (visible on hover or when selected) */}
      <div
        data-select-checkbox
        className={cn(
          "absolute -top-1.5 -left-1 z-10 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect?.(task._id)}
          className="h-4 w-4 bg-background shadow-sm"
        />
      </div>

      {/* Archived badge */}
      {task.isArchived && (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 mb-1.5 border-amber-300 text-amber-600"
        >
          Diarsipkan
        </Badge>
      )}

      {/* Title */}
      <h4 className="text-sm font-medium text-foreground leading-snug line-clamp-2 pr-1">
        {task.title}
      </h4>

      {/* Divisi terlibat + PIC per divisi */}
      {(divisionList.length > 0 || picList.length > 0) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {divisionList.slice(0, 2).map((item) => (
            <Badge
              key={item._id}
              variant="outline"
              className="h-4.5 gap-1 border-primary/20 bg-primary/5 px-1.5 py-0 text-[10px] font-normal text-primary"
            >
              {item.color && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="max-w-[110px] truncate">{item.name}</span>
            </Badge>
          ))}
          {divisionList.length > 2 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="h-4.5 px-1.5 py-0 text-[10px] font-normal"
                >
                  +{divisionList.length - 2}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {divisionList
                  .slice(2)
                  .map((item) => item.name)
                  .join(", ")}
              </TooltipContent>
            </Tooltip>
          )}
          {hasCoordination && (
            <Badge
              variant="outline"
              className="h-4.5 border-amber-300/60 bg-amber-500/5 px-1.5 py-0 text-[9px] font-normal text-amber-700 dark:text-amber-400"
            >
              Koordinasi
            </Badge>
          )}
          {picList.length > 0 && (
            <div className="ml-auto">
              <PicStack pics={picList} />
            </div>
          )}
        </div>
      )}

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.labels.map((label) => (
            <span
              key={label._id}
              className="inline-block h-1.5 w-8 rounded-full"
              style={{ backgroundColor: label.color || "#6B7280" }}
              title={label.name}
            />
          ))}
        </div>
      )}

      {/* Meta row: due date, subtasks, attachments, comments */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {/* Due date */}
        {dueInfo && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-medium rounded-md px-1.5 py-0.5",
              dueInfo.overdue &&
                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
              dueInfo.today &&
                "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              !dueInfo.overdue &&
                !dueInfo.today &&
                "bg-muted text-muted-foreground",
            )}
          >
            <Calendar className="h-3 w-3" />
            {dueInfo.text}
          </span>
        )}

        {/* Subtask progress */}
        <SubtaskProgress subtasks={task.subtasks} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Indicators */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {isDependencyBlocked && (
            <Tooltip>
              <TooltipTrigger>
                <Lock className="h-3.5 w-3.5 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>Diblokir oleh task lain</TooltipContent>
            </Tooltip>
          )}

          {attachmentCount > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center gap-0.5 text-[11px]">
                  <Paperclip className="h-3 w-3" />
                  {attachmentCount}
                </span>
              </TooltipTrigger>
              <TooltipContent>{attachmentCount} lampiran</TooltipContent>
            </Tooltip>
          )}

          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <MessageSquare className="h-3 w-3" />
              {commentCount}
            </span>
          )}
        </div>
      </div>

      {/* Bottom: Assignees */}
      {task.assignees && task.assignees.length > 0 && (
        <div className="flex items-center justify-end mt-2 pt-2 border-t border-border/40">
          <AssigneeStack assignees={task.assignees} />
        </div>
      )}
    </div>
  );

  if (!isDraggable) {
    return renderCard();
  }

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => renderCard(provided, snapshot)}
    </Draggable>
  );
}

// Check if task is blocked by unfinished dependencies
function isBlocked(task, allColumnsDoneIds) {
  if (!task.blockedBy || task.blockedBy.length === 0) return false;
  // If any blocking task is not in a "done" column or is not archived
  return task.blockedBy.some((dep) => {
    if (typeof dep === "string") return true; // can't determine, show blocked
    const depColumnId =
      typeof dep.columnId === "string"
        ? dep.columnId
        : dep.columnId?.toString();
    return !allColumnsDoneIds.includes(depColumnId) && !dep.isArchived;
  });
}

// Memoized export
export const TaskCard = memo(TaskCardInner);
export { isBlocked, getInitials, PRIORITY_CONFIG };
