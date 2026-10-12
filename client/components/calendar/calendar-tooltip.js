"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { format, isPast, isToday } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/components/kanban/task-card";

// ── Priority config (Tasks) ─────────────────────────────────────
const PRIORITY_CONFIG = {
  low: {
    label: "Low",
    color: "#94a3b8",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  medium: {
    label: "Medium",
    color: "#f59e0b",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  high: {
    label: "High",
    color: "#f97316",
    bg: "bg-orange-50 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  critical: {
    label: "Critical",
    color: "#ef4444",
    bg: "bg-rose-50 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

// ── Event status config (Events) ────────────────────────────────
const EVENT_STATUS_CONFIG = {
  upcoming: {
    label: "Akan Datang",
    color: "#0284c7",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  ongoing: {
    label: "Berlangsung",
    color: "#10b981",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Selesai",
    color: "#64748b",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

/**
 * Floating tooltip on calendar item hover.
 * Supports both tasks (priority, assignees, due date) and events (status, division, participants, date range).
 */
export function CalendarTooltip({ calendarRef }) {
  const [tooltip, setTooltip] = useState(null);
  const tooltipRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const showTooltip = useCallback((event, rect) => {
    clearTimeout(hideTimeoutRef.current);
    const isEvent = Boolean(event.extendedProps?.isEvent);
    const task = event.extendedProps?.task;
    const eventData = event.extendedProps?.event;

    if (!task && !isEvent && !eventData) return;

    setTooltip({
      isEvent,
      task,
      eventData: eventData || (isEvent ? event.extendedProps : null),
      event,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  const hideTooltip = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setTooltip(null);
    }, 150);
  }, []);

  // Attach mouse listeners to calendar event elements
  useEffect(() => {
    const container = calendarRef?.current;
    if (!container) return;

    const handleMouseEnter = (e) => {
      const el = e.target.closest(".fc-event");
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const tooltipData = el.__tooltipData;
      if (tooltipData) {
        showTooltip(tooltipData, rect);
      }
    };

    const handleMouseLeave = (e) => {
      const el = e.target.closest(".fc-event");
      if (el) hideTooltip();
    };

    container.addEventListener("mouseenter", handleMouseEnter, true);
    container.addEventListener("mouseleave", handleMouseLeave, true);

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter, true);
      container.removeEventListener("mouseleave", handleMouseLeave, true);
      clearTimeout(hideTimeoutRef.current);
    };
  }, [calendarRef, showTooltip, hideTooltip]);

  if (!tooltip) return null;

  const { isEvent, task, eventData, event } = tooltip;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: tooltip.x,
        top: tooltip.y - 10,
        transform: "translate(-50%, -100%)",
      }}
      onMouseEnter={() => clearTimeout(hideTimeoutRef.current)}
      onMouseLeave={hideTooltip}
    >
      {isEvent ? (
        <EventTooltipContent eventData={eventData} event={event} />
      ) : (
        <TaskTooltipContent task={task} event={event} />
      )}
    </div>
  );
}

function EventTooltipContent({ eventData, event }) {
  const status = eventData?.status || "upcoming";
  const statusCfg = EVENT_STATUS_CONFIG[status] || EVENT_STATUS_CONFIG.upcoming;
  const eventColor = eventData?.color || "#8B5CF6";
  const participants = eventData?.participants || [];
  const divisionName = eventData?.divisionName || eventData?.division?.name;
  const divisionColor = eventData?.divisionColor || eventData?.division?.color || eventColor;

  const startDate = eventData?.startDate ? new Date(eventData.startDate) : null;
  const endDate = eventData?.endDate ? new Date(eventData.endDate) : null;

  const isSameDay =
    startDate &&
    endDate &&
    startDate.toDateString() === endDate.toDateString();

  const formattedDates =
    startDate && endDate
      ? isSameDay
        ? format(startDate, "d MMM yyyy", { locale: localeId })
        : `${format(startDate, "d MMM yyyy", { locale: localeId })} – ${format(
            endDate,
            "d MMM yyyy",
            { locale: localeId }
          )}`
      : startDate
      ? format(startDate, "d MMM yyyy", { locale: localeId })
      : null;

  return (
    <div className="cal-tooltip">
      {/* Accent strip */}
      <div
        className="cal-tooltip__accent"
        style={{ backgroundColor: eventColor }}
      />

      <div className="cal-tooltip__content">
        {/* Header */}
        <div className="cal-tooltip__header">
          <p className="cal-tooltip__title">{event.title}</p>
          <span
            className={cn(
              "cal-tooltip__priority-pill",
              statusCfg.bg,
              statusCfg.text
            )}
          >
            <span
              className={cn("cal-tooltip__priority-dot", statusCfg.dot)}
            />
            {statusCfg.label}
          </span>
        </div>

        {/* Divider */}
        <div className="cal-tooltip__divider" />

        {/* Info rows */}
        <div className="cal-tooltip__rows">
          {formattedDates && (
            <div className="cal-tooltip__row">
              <span className="cal-tooltip__label">Jadwal</span>
              <span className="cal-tooltip__value text-[11px] font-medium">
                {formattedDates}
              </span>
            </div>
          )}

          {divisionName && (
            <div className="cal-tooltip__row">
              <span className="cal-tooltip__label">Divisi</span>
              <span className="cal-tooltip__value">
                <span
                  className="cal-tooltip__status-dot"
                  style={{ backgroundColor: divisionColor }}
                />
                {divisionName}
              </span>
            </div>
          )}

          {participants.length > 0 && (
            <div className="cal-tooltip__row cal-tooltip__row--assignees">
              <span className="cal-tooltip__label">Peserta</span>
              <div className="cal-tooltip__assignees">
                {participants.slice(0, 4).map((p, i) => (
                  <div
                    key={p._id || i}
                    className="cal-tooltip__assignee"
                    style={{ zIndex: participants.length - i }}
                  >
                    <Avatar className="cal-tooltip__avatar">
                      <AvatarFallback className="cal-tooltip__avatar-fallback">
                        {getInitials(p.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}
                {participants.length > 4 && (
                  <span className="cal-tooltip__assignee-extra">
                    +{participants.length - 4}
                  </span>
                )}
                <span className="cal-tooltip__assignee-names">
                  {participants
                    .slice(0, 2)
                    .map((p) => p.name?.split(" ")[0])
                    .join(", ")}
                  {participants.length > 2 &&
                    ` & ${participants.length - 2} lainnya`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Caret */}
      <div className="cal-tooltip__caret">
        <div className="cal-tooltip__caret-inner" />
      </div>
    </div>
  );
}

function TaskTooltipContent({ task, event }) {
  const priorityConfig = PRIORITY_CONFIG[task?.priority] || PRIORITY_CONFIG.medium;
  const dueDate = task?.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && isToday(dueDate);
  const columnName = event.extendedProps?.columnName;
  const columnColor = event.extendedProps?.columnColor;

  return (
    <div className="cal-tooltip">
      {/* Priority accent strip */}
      <div
        className="cal-tooltip__accent"
        style={{ backgroundColor: priorityConfig.color }}
      />

      <div className="cal-tooltip__content">
        {/* Header */}
        <div className="cal-tooltip__header">
          <p className="cal-tooltip__title">{task?.title || event.title}</p>

          <span
            className={cn(
              "cal-tooltip__priority-pill",
              priorityConfig.bg,
              priorityConfig.text
            )}
          >
            <span className={cn("cal-tooltip__priority-dot", priorityConfig.dot)} />
            {priorityConfig.label}
          </span>
        </div>

        {/* Divider */}
        <div className="cal-tooltip__divider" />

        {/* Info rows */}
        <div className="cal-tooltip__rows">
          {columnName && (
            <div className="cal-tooltip__row">
              <span className="cal-tooltip__label">Status</span>
              <span className="cal-tooltip__value">
                <span
                  className="cal-tooltip__status-dot"
                  style={{ backgroundColor: columnColor || "#888" }}
                />
                {columnName}
              </span>
            </div>
          )}

          {dueDate && (
            <div className="cal-tooltip__row">
              <span className="cal-tooltip__label">Due</span>
              <span
                className={cn(
                  "cal-tooltip__value",
                  isOverdue && "cal-tooltip__value--overdue",
                  isDueToday && "cal-tooltip__value--today"
                )}
              >
                {format(dueDate, "d MMM yyyy", { locale: localeId })}
                {isOverdue && (
                  <span className="cal-tooltip__badge cal-tooltip__badge--overdue">
                    Overdue
                  </span>
                )}
                {isDueToday && (
                  <span className="cal-tooltip__badge cal-tooltip__badge--today">
                    Today
                  </span>
                )}
              </span>
            </div>
          )}

          {task?.assignees?.length > 0 && (
            <div className="cal-tooltip__row cal-tooltip__row--assignees">
              <span className="cal-tooltip__label">Assignee</span>
              <div className="cal-tooltip__assignees">
                {task.assignees.slice(0, 4).map((a, i) => (
                  <div
                    key={a._id}
                    className="cal-tooltip__assignee"
                    style={{ zIndex: task.assignees.length - i }}
                  >
                    <Avatar className="cal-tooltip__avatar">
                      <AvatarFallback className="cal-tooltip__avatar-fallback">
                        {getInitials(a.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}
                {task.assignees.length > 4 && (
                  <span className="cal-tooltip__assignee-extra">
                    +{task.assignees.length - 4}
                  </span>
                )}
                <span className="cal-tooltip__assignee-names">
                  {task.assignees
                    .slice(0, 2)
                    .map((a) => a.name.split(" ")[0])
                    .join(", ")}
                  {task.assignees.length > 2 &&
                    ` & ${task.assignees.length - 2} lainnya`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Caret */}
      <div className="cal-tooltip__caret">
        <div className="cal-tooltip__caret-inner" />
      </div>
    </div>
  );
}
