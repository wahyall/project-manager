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
    pulse: "bg-sky-400",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    label: "Akan Datang",
  },
  ongoing: {
    pulse: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    label: "Berlangsung",
  },
  completed: {
    pulse: "bg-slate-400",
    badge: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25",
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

// ── Event Bar (Redesigned to modern two-line chip) ──────────────
function EventBarContent({ event }) {
  const {
    status = "upcoming",
    participants = [],
    color = "#8B5CF6",
    divisionName,
    divisionColor,
  } = event.extendedProps;

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
  const firstParticipant = participants?.[0];
  const extraCount = participants.length > 1 ? participants.length - 1 : 0;

  return (
    <div
      className="cal-event-chip"
      title={`${event.title} · ${statusCfg.label}${
        divisionName ? ` · ${divisionName}` : ""
      }${participants.length > 0 ? ` · ${participants.length} peserta` : ""}`}
    >
      {/* Accent bar with event theme color */}
      <span
        className="cal-event-chip__bar"
        style={{ backgroundColor: color }}
      />

      {/* Content body */}
      <span className="cal-event-chip__body">
        {/* Row 1: Status pulse dot + Event title */}
        <span className="cal-event-chip__title-row">
          <span className="cal-event-chip__pulse-wrap">
            <span
              className={cn(
                "cal-event-chip__pulse",
                statusCfg.pulse,
                status === "ongoing" && "cal-event-chip__pulse--live"
              )}
            />
          </span>
          <span className="cal-event-chip__title">{event.title}</span>
        </span>

        {/* Row 2: Status badge + Division dot/name + Participant avatars */}
        <span className="cal-event-chip__meta">
          <span
            className={cn(
              "cal-event-chip__status-badge",
              statusCfg.badge
            )}
          >
            {statusCfg.label}
          </span>

          {divisionName && (
            <span className="cal-event-chip__division">
              {divisionColor && (
                <span
                  className="cal-event-chip__division-dot"
                  style={{ backgroundColor: divisionColor }}
                />
              )}
              <span className="cal-event-chip__division-name">
                {divisionName}
              </span>
            </span>
          )}

          {firstParticipant && (
            <span className="cal-event-chip__avatars">
              <Avatar
                className="cal-event-chip__avatar"
                style={{ borderColor: color }}
              >
                <AvatarFallback className="cal-event-chip__avatar-fallback">
                  {getInitials(firstParticipant.name)}
                </AvatarFallback>
              </Avatar>
              {extraCount > 0 && (
                <span className="cal-event-chip__extra">+{extraCount}</span>
              )}
            </span>
          )}
        </span>
      </span>
    </div>
  );
}
