"use client";

import { memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/components/kanban/task-card";

// ── Priority system ─────────────────────────────────────────────
const PRIORITY_CONFIG = {
  low: {
    bar: "bg-slate-400",
    dot: "bg-slate-400",
    ring: "ring-slate-200 dark:ring-slate-700",
    label: "Low",
  },
  medium: {
    bar: "bg-amber-400",
    dot: "bg-amber-400",
    ring: "ring-amber-200 dark:ring-amber-800",
    label: "Med",
  },
  high: {
    bar: "bg-orange-500",
    dot: "bg-orange-500",
    ring: "ring-orange-200 dark:ring-orange-800",
    label: "High",
  },
  critical: {
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    ring: "ring-rose-200 dark:ring-rose-800",
    label: "Crit",
  },
};

// ── Event status system ─────────────────────────────────────────
const STATUS_CONFIG = {
  upcoming: {
    pulse: "bg-sky-300",
    label: "Akan Datang",
  },
  ongoing: {
    pulse: "bg-emerald-400",
    label: "Berlangsung",
  },
  completed: {
    pulse: "bg-white/40",
    label: "Selesai",
  },
};

/**
 * Custom event content renderer for FullCalendar.
 * Renders task chips (with priority accent + assignee) or event bars (with status + participants).
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

// ── Task Chip ───────────────────────────────────────────────────
function TaskChipContent({ event }) {
  const { priority, assignees, columnName, columnColor } = event.extendedProps;
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  const firstAssignee = assignees?.[0];
  const extraCount = assignees?.length > 1 ? assignees.length - 1 : 0;

  return (
    <div
      className="cal-task-chip"
      title={`${event.title}${columnName ? ` · ${columnName}` : ""}${
        firstAssignee ? ` · ${firstAssignee.name}` : ""
      }`}
    >
      {/* Priority accent bar */}
      <span className={cn("cal-task-chip__bar", config.bar)} />

      {/* Content */}
      <span className="cal-task-chip__body">
        {/* Title */}
        <span className="cal-task-chip__title">{event.title}</span>

        {/* Meta row */}
        <span className="cal-task-chip__meta">
          {/* Column status dot */}
          {columnColor && (
            <span
              className="cal-task-chip__status-dot"
              style={{ backgroundColor: columnColor }}
            />
          )}

          {/* Assignees */}
          {firstAssignee && (
            <span className="cal-task-chip__avatars">
              <Avatar
                className={cn(
                  "cal-task-chip__avatar",
                  config.ring
                )}
              >
                <AvatarFallback className="cal-task-chip__avatar-fallback">
                  {getInitials(firstAssignee.name)}
                </AvatarFallback>
              </Avatar>
              {extraCount > 0 && (
                <span className="cal-task-chip__extra">+{extraCount}</span>
              )}
            </span>
          )}
        </span>
      </span>
    </div>
  );
}

// ── Event Bar ───────────────────────────────────────────────────
function EventBarContent({ event }) {
  const { status, participants } = event.extendedProps;
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
  const participantCount = participants?.length ?? 0;

  return (
    <div
      className="cal-event-bar"
      title={`${event.title}${status ? ` · ${statusCfg.label}` : ""}${
        participantCount > 0 ? ` · ${participantCount} peserta` : ""
      }`}
    >
      {/* Status pulse indicator */}
      <span className="cal-event-bar__pulse-wrap">
        <span
          className={cn(
            "cal-event-bar__pulse",
            statusCfg.pulse,
            status === "ongoing" && "cal-event-bar__pulse--live"
          )}
        />
      </span>

      {/* Title */}
      <span className="cal-event-bar__title">{event.title}</span>

      {/* Right meta */}
      <span className="cal-event-bar__right">
        {/* Participant count chip */}
        {participantCount > 0 && (
          <span className="cal-event-bar__count">
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {participantCount}
          </span>
        )}
      </span>
    </div>
  );
}
