"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

// Priority colors for FullCalendar events (hex values for FC)
const PRIORITY_COLORS = {
  low: { bg: "#94a3b8", border: "#64748b", text: "#1e293b" },
  medium: { bg: "#fbbf24", border: "#f59e0b", text: "#78350f" },
  high: { bg: "#f97316", border: "#ea580c", text: "#fff" },
  critical: { bg: "#ef4444", border: "#dc2626", text: "#fff" },
};

/**
 * useCalendar — Core hook for Calendar View
 *
 * Fetches tasks for visible date range, transforms to FullCalendar events,
 * handles filters, drag/resize updates, and Socket.io real-time sync.
 */
export function useCalendar(workspaceId, workspace) {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Current date range being viewed
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // Filter state
  const [filters, setFilters] = useState({
    assignee: [],
    priority: [],
    label: [],
    eventId: null,
    keyword: "",
    type: "all", // "all" | "tasks" | "events"
  });

  // Detail panel state
  const [activeTaskId, setActiveTaskId] = useState(null);

  // Columns from workspace
  const columns = useMemo(() => {
    if (!workspace?.kanbanColumns) return [];
    return [...workspace.kanbanColumns].sort((a, b) => a.order - b.order);
  }, [workspace?.kanbanColumns]);

  // Column lookup map for display
  const columnMap = useMemo(() => {
    const map = {};
    for (const col of columns) {
      map[col._id] = col;
    }
    return map;
  }, [columns]);

  // ── Fetch calendar data ─────────────────────────
  const fetchCalendarData = useCallback(
    async (start, end) => {
      if (!workspaceId || !start || !end) return;

      setLoading(true);
      setError(null);

      try {
        const params = {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          type: filters.type,
        };

        if (filters.assignee.length === 1) {
          params.assignee = filters.assignee[0];
        }
        if (filters.priority.length === 1) {
          params.priority = filters.priority[0];
        }
        if (filters.label.length === 1) {
          params.label = filters.label[0];
        }
        if (filters.eventId) {
          params.eventId = filters.eventId;
        }

        const { data } = await api.get(
          `/workspaces/${workspaceId}/calendar`,
          { params }
        );

        setTasks(data.data.tasks || []);
        setEvents(data.data.events || []);
      } catch (err) {
        console.error("Failed to fetch calendar data:", err);
        setError("Gagal memuat data kalender");
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, filters.type, filters.assignee, filters.priority, filters.label, filters.eventId]
  );

  // Refetch when date range or filters change
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchCalendarData(dateRange.start, dateRange.end);
    }
  }, [dateRange, fetchCalendarData]);

  // ── Client-side filter (for multi-value filters & keyword) ──
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Must have at least a dueDate to show on calendar
      if (!task.dueDate) return false;

      // Assignee filter (multi)
      if (filters.assignee.length > 0) {
        const taskAssigneeIds = (task.assignees || []).map((a) =>
          typeof a === "string" ? a : a._id
        );
        if (!filters.assignee.some((id) => taskAssigneeIds.includes(id)))
          return false;
      }

      // Priority filter (multi)
      if (filters.priority.length > 0) {
        if (!filters.priority.includes(task.priority)) return false;
      }

      // Label filter (multi)
      if (filters.label.length > 0) {
        const taskLabelIds = (task.labels || []).map((l) =>
          typeof l === "string" ? l : l._id
        );
        if (!filters.label.some((id) => taskLabelIds.includes(id)))
          return false;
      }

      // Event filter
      if (filters.eventId) {
        const taskEventId =
          typeof task.eventId === "string" ? task.eventId : task.eventId?._id;
        if (taskEventId !== filters.eventId) return false;
      }

      // Keyword search
      if (filters.keyword.trim()) {
        if (
          !task.title
            .toLowerCase()
            .includes(filters.keyword.trim().toLowerCase())
        )
          return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // ── Client-side filter for events ────────────────
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Keyword search
      if (filters.keyword.trim()) {
        if (
          !event.title
            .toLowerCase()
            .includes(filters.keyword.trim().toLowerCase())
        )
          return false;
      }
      return true;
    });
  }, [events, filters.keyword]);

  // ── Transform to FullCalendar events ────────────
  const calendarEvents = useMemo(() => {
    // Task → FC events
    const taskEvents = filteredTasks.map((task) => {
      const colors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
      const hasRange = task.startDate && task.dueDate;

      // For FullCalendar: end date is exclusive for allDay events,
      // so add 1 day to dueDate for proper display
      const endDate = new Date(task.dueDate);
      endDate.setDate(endDate.getDate() + 1);

      return {
        id: task._id,
        title: task.title,
        start: hasRange ? task.startDate : task.dueDate,
        end: endDate.toISOString(),
        allDay: true,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: {
          task,
          priority: task.priority,
          columnId: task.columnId,
          columnName: columnMap[task.columnId]?.name || "",
          columnColor: columnMap[task.columnId]?.color || "#888",
          assignees: task.assignees || [],
          labels: task.labels || [],
          subtasks: task.subtasks || [],
          hasRange,
          isEvent: false,
        },
      };
    });

    // Event → FC events (all-day bars with event color)
    const eventItems = filteredEvents.map((event) => {
      const color = event.color || "#8B5CF6";
      // Lighten the background for better text contrast
      const endDate = new Date(event.endDate);
      endDate.setDate(endDate.getDate() + 1);

      return {
        id: `event-${event._id}`,
        title: event.title,
        start: event.startDate,
        end: endDate.toISOString(),
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        textColor: "#fff",
        editable: false, // Events are not drag/resizable from calendar
        extendedProps: {
          event,
          eventId: event._id,
          status: event.status,
          participants: event.participants || [],
          isEvent: true,
        },
      };
    });

    return [...eventItems, ...taskEvents];
  }, [filteredTasks, filteredEvents, columnMap]);

  // ── Update task dates (drag / resize) ───────────
  const updateTaskDates = useCallback(
    async (taskId, newStart, newEnd) => {
      try {
        const updates = {};

        if (newStart) {
          updates.startDate = newStart.toISOString();
        }
        if (newEnd) {
          // FullCalendar end is exclusive for allDay, subtract 1 day
          const adjustedEnd = new Date(newEnd);
          adjustedEnd.setDate(adjustedEnd.getDate() - 1);
          updates.dueDate = adjustedEnd.toISOString();
        }

        await api.put(`/workspaces/${workspaceId}/tasks/${taskId}`, updates);

        // Optimistic update local state
        setTasks((prev) =>
          prev.map((t) =>
            t._id === taskId
              ? {
                  ...t,
                  ...(updates.startDate && { startDate: updates.startDate }),
                  ...(updates.dueDate && { dueDate: updates.dueDate }),
                }
              : t
          )
        );

        return true;
      } catch (err) {
        console.error("Failed to update task dates:", err);
        // Refetch to revert
        if (dateRange.start && dateRange.end) {
          fetchCalendarData(dateRange.start, dateRange.end);
        }
        return false;
      }
    },
    [workspaceId, dateRange, fetchCalendarData]
  );

  // ── Active filter count ────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.assignee.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.label.length > 0) count++;
    if (filters.eventId) count++;
    if (filters.keyword.trim()) count++;
    if (filters.type !== "all") count++;
    return count;
  }, [filters]);

  // ── Active task / event data ────────────────────
  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return tasks.find((t) => t._id === activeTaskId) || null;
  }, [activeTaskId, tasks]);

  // Active event (when clicking an event bar on calendar)
  const [activeEventId, setActiveEventId] = useState(null);
  const activeEvent = useMemo(() => {
    if (!activeEventId) return null;
    return events.find((e) => e._id === activeEventId) || null;
  }, [activeEventId, events]);

  // ── Socket.io real-time sync ────────────────────
  const dateRangeRef = useRef(dateRange);
  dateRangeRef.current = dateRange;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const refetch = () => {
      const { start, end } = dateRangeRef.current;
      if (start && end) {
        fetchCalendarData(start, end);
      }
    };

    // Any task/event change → refetch calendar data
    socket.on("task:created", refetch);
    socket.on("task:updated", refetch);
    socket.on("task:moved", refetch);
    socket.on("task:deleted", refetch);
    socket.on("task:archived", refetch);
    socket.on("task:bulk-archived", refetch);
    socket.on("event:created", refetch);
    socket.on("event:updated", refetch);
    socket.on("event:deleted", refetch);

    return () => {
      socket.off("task:created", refetch);
      socket.off("task:updated", refetch);
      socket.off("task:moved", refetch);
      socket.off("task:deleted", refetch);
      socket.off("task:archived", refetch);
      socket.off("task:bulk-archived", refetch);
      socket.off("event:created", refetch);
      socket.off("event:updated", refetch);
      socket.off("event:deleted", refetch);
    };
  }, [fetchCalendarData]);

  return {
    // Data
    tasks: filteredTasks,
    events: filteredEvents,
    calendarEvents,
    columns,
    columnMap,
    loading,
    error,

    // Date range
    dateRange,
    setDateRange,

    // Filters
    filters,
    setFilters,
    activeFilterCount,

    // Actions
    updateTaskDates,
    refetch: () => {
      if (dateRange.start && dateRange.end) {
        fetchCalendarData(dateRange.start, dateRange.end);
      }
    },

    // Task detail panel
    activeTaskId,
    setActiveTaskId,
    activeTask,

    // Event detail
    activeEventId,
    setActiveEventId,
    activeEvent,
  };
}

