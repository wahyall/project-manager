"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { format, isPast, isToday } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getInitials } from "@/components/kanban/task-card";

const PRIORITY_LABELS = {
  low: { label: "Low", color: "bg-slate-400", text: "text-slate-700" },
  medium: { label: "Medium", color: "bg-amber-400", text: "text-amber-700" },
  high: { label: "High", color: "bg-orange-500", text: "text-orange-700" },
  critical: { label: "Critical", color: "bg-red-500", text: "text-red-700" },
};

/**
 * Floating tooltip that appears on hover over calendar events.
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

      // Find the FullCalendar event data from the DOM
      const fcEventEl = el;
      const rect = fcEventEl.getBoundingClientRect();

      // Get event ID from the element
      const eventId = el.getAttribute("data-event-id") ||
        el.closest("[data-event-id]")?.getAttribute("data-event-id");

      // We'll use a simpler approach - attach data via eventDidMount
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

  const { task } = tooltip;
  const priorityConfig = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium;
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: tooltip.x,
        top: tooltip.y - 8,
        transform: "translate(-50%, -100%)",
      }}
      onMouseEnter={() => clearTimeout(hideTimeoutRef.current)}
      onMouseLeave={hideTooltip}
    >
      <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 max-w-[280px] min-w-[200px]">
        {/* Title */}
        <p className="font-semibold text-sm leading-tight mb-2 line-clamp-2">
          {task.title}
        </p>

        <div className="space-y-1.5">
          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-14">
              Prioritas
            </span>
            <Badge
              variant="secondary"
              className={cn("text-[10px] h-4 px-1.5 gap-1")}
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", priorityConfig.color)}
              />
              {priorityConfig.label}
            </Badge>
          </div>

          {/* Due Date */}
          {dueDate && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-14">
                Due Date
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  isOverdue && "text-red-500"
                )}
              >
                {format(dueDate, "d MMM yyyy", { locale: localeId })}
                {isOverdue && " (overdue)"}
              </span>
            </div>
          )}

          {/* Status */}
          {tooltip.event.extendedProps?.columnName && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-14">
                Status
              </span>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      tooltip.event.extendedProps?.columnColor || "#888",
                  }}
                />
                {tooltip.event.extendedProps.columnName}
              </Badge>
            </div>
          )}

          {/* Assignees */}
          {task.assignees?.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-14">
                Assignee
              </span>
              <div className="flex items-center gap-1">
                {task.assignees.slice(0, 3).map((a) => (
                  <div key={a._id} className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                        {getInitials(a.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px]">{a.name.split(" ")[0]}</span>
                  </div>
                ))}
                {task.assignees.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{task.assignees.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full">
          <div className="w-2 h-2 rotate-45 bg-popover border-r border-b -mt-1" />
        </div>
      </div>
    </div>
  );
}

