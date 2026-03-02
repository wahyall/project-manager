"use client";

import { memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/components/kanban/task-card";
import { Calendar } from "lucide-react";

const PRIORITY_DOT = {
  low: "bg-slate-400",
  medium: "bg-amber-400",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const STATUS_LABEL = {
  upcoming: "Akan Datang",
  ongoing: "Berlangsung",
  completed: "Selesai",
};

/**
 * Custom event content renderer for FullCalendar.
 * Renders task chips (with priority dot + assignee) or event bars (with calendar icon).
 */
export const CalendarEventContent = memo(function CalendarEventContent({
  eventInfo,
}) {
  const { event } = eventInfo;
  const { isEvent } = event.extendedProps;

  if (isEvent) {
    return <EventBarContent event={event} />;
  }

  return <TaskChipContent event={event} />;
});

/** Task chip: priority dot + title + assignee avatar */
function TaskChipContent({ event }) {
  const { priority, assignees, columnName } = event.extendedProps;
  const firstAssignee = assignees?.[0];

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 min-w-0 w-full overflow-hidden rounded-sm",
        "cursor-pointer select-none"
      )}
      title={`${event.title}${columnName ? ` • ${columnName}` : ""}${
        firstAssignee ? ` • ${firstAssignee.name}` : ""
      }`}
    >
      {/* Priority dot */}
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          PRIORITY_DOT[priority] || PRIORITY_DOT.medium
        )}
      />

      {/* Title */}
      <span className="text-[11px] font-medium truncate leading-tight flex-1 min-w-0">
        {event.title}
      </span>

      {/* Assignee avatar (only first, small) */}
      {firstAssignee && (
        <Avatar className="h-4 w-4 shrink-0 border border-background">
          <AvatarFallback className="text-[7px] bg-white/30 text-inherit font-semibold">
            {getInitials(firstAssignee.name)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Extra assignee count */}
      {assignees?.length > 1 && (
        <span className="text-[9px] opacity-70 shrink-0">
          +{assignees.length - 1}
        </span>
      )}
    </div>
  );
}

/** Event bar: calendar icon + title + status badge */
function EventBarContent({ event }) {
  const { status, participants } = event.extendedProps;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 min-w-0 w-full overflow-hidden rounded-sm",
        "cursor-pointer select-none"
      )}
      title={`${event.title}${status ? ` • ${STATUS_LABEL[status] || status}` : ""}`}
    >
      {/* Calendar icon to distinguish from tasks */}
      <Calendar className="h-3 w-3 shrink-0 opacity-80" />

      {/* Title */}
      <span className="text-[11px] font-semibold truncate leading-tight flex-1 min-w-0">
        {event.title}
      </span>

      {/* Status dot */}
      {status && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            status === "ongoing" && "bg-green-300",
            status === "upcoming" && "bg-white/50",
            status === "completed" && "bg-white/30"
          )}
        />
      )}

      {/* Participant count */}
      {participants?.length > 0 && (
        <span className="text-[9px] opacity-70 shrink-0">
          {participants.length}
        </span>
      )}
    </div>
  );
}
