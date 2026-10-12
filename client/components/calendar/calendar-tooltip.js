"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { format, isPast, isToday, isFuture } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/components/kanban/task-card";

// ── Priority config ─────────────────────────────────────────────
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

/**
 * Floating tooltip on calendar event hover.
 * Shows task details: title, assignees, due date, status, priority.
 */
export function CalendarTooltip({ calendarRef }) {
  const [tooltip, setTooltip] = useState(null);
  const tooltipRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const showTooltip = useCallback((event, rect) => {
    clearTimeout(hideTimeoutRef.current);
    const task = event.extendedProps?.task;
    if (!task) return;

    setTooltip({
      task,
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

  const { task, event } = tooltip;
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && isToday(dueDate);
  const isUpcoming = dueDate && isFuture(dueDate) && !isDueToday;
  const columnName = event.extendedProps?.columnName;
  const columnColor = event.extendedProps?.columnColor;

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
      <div className="cal-tooltip">
        {/* Priority accent strip */}
        <div
          className="cal-tooltip__accent"
          style={{ backgroundColor: priorityConfig.color }}
        />

        <div className="cal-tooltip__content">
          {/* Header */}
          <div className="cal-tooltip__header">
            <p className="cal-tooltip__title">{task.title}</p>

            {/* Priority pill */}
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
            {/* Column/Status */}
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

            {/* Due Date */}
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

            {/* Assignees */}
            {task.assignees?.length > 0 && (
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
    </div>
  );
}
