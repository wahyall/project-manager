"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

const PAGE_SIZE = 20;

/**
 * useKanban — Core hook for Kanban Board
 *
 * Fetches tasks per-column with pagination (infinite scroll),
 * handles client-side filtering, CRUD, bulk ops, and Socket.io sync.
 */
export function useKanban(workspaceId, workspace) {
  // Flat task store keyed by task._id for O(1) lookup
  const [taskMap, setTaskMap] = useState({});
  const [labels, setLabels] = useState([]);
  const [error, setError] = useState(null);

  // Per-column pagination: { [columnId]: { page, totalPages, total, loading, hasMore, initialLoaded } }
  const [columnMeta, setColumnMeta] = useState({});

  // ── Filter state ─────────────────────────────────
  const [filters, setFilters] = useState({
    assignee: [],
    label: [],
    priority: [],
    eventId: null,
    dueDateFrom: null,
    dueDateTo: null,
    keyword: "",
    showArchived: false,
  });

  // ── Selection state (for bulk actions) ───────────
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

  // ── Detail panel state ───────────────────────────
  const [activeTaskId, setActiveTaskId] = useState(null);

  // ── Columns sorted by order ──────────────────────
  const columns = useMemo(() => {
    if (!workspace?.kanbanColumns) return [];
    return [...workspace.kanbanColumns].sort((a, b) => a.order - b.order);
  }, [workspace?.kanbanColumns]);

  // Derive flat tasks array from map
  const tasks = useMemo(() => Object.values(taskMap), [taskMap]);

  // Global loading = any column still on initial load
  const loading = useMemo(() => {
    if (columns.length === 0) return false;
    return columns.some((col) => !columnMeta[col._id]?.initialLoaded);
  }, [columns, columnMeta]);

  // ── Fetch a single column page ───────────────────
  const fetchColumnPage = useCallback(
    async (columnId, page = 1, replace = false) => {
      if (!workspaceId) return;

      // Mark column as loading
      setColumnMeta((prev) => ({
        ...prev,
        [columnId]: {
          ...prev[columnId],
          loading: true,
        },
      }));

      try {
        const params = {
          columnId,
          limit: PAGE_SIZE,
          page,
          sortBy: "columnOrder",
          sortOrder: "asc",
        };
        if (filters.showArchived) params.isArchived = "all";

        const { data } = await api.get(`/workspaces/${workspaceId}/tasks`, {
          params,
        });

        const fetchedTasks = data.data.tasks;
        const pagination = data.data.pagination;

        // Update task map
        setTaskMap((prev) => {
          const next = { ...prev };

          // If replacing (e.g. refresh), remove existing tasks in this column first
          if (replace) {
            for (const id of Object.keys(next)) {
              const t = next[id];
              const tColId =
                typeof t.columnId === "string"
                  ? t.columnId
                  : t.columnId?.toString();
              if (tColId === columnId) {
                delete next[id];
              }
            }
          }

          // Merge fetched tasks
          for (const task of fetchedTasks) {
            next[task._id] = task;
          }
          return next;
        });

        // Update column meta
        setColumnMeta((prev) => ({
          ...prev,
          [columnId]: {
            page: pagination.page,
            totalPages: pagination.totalPages,
            total: pagination.total,
            loading: false,
            hasMore: pagination.page < pagination.totalPages,
            initialLoaded: true,
          },
        }));
      } catch (err) {
        console.error(`Failed to fetch column ${columnId}:`, err);
        setError("Gagal memuat task");
        setColumnMeta((prev) => ({
          ...prev,
          [columnId]: {
            ...prev[columnId],
            loading: false,
            initialLoaded: true,
          },
        }));
      }
    },
    [workspaceId, filters.showArchived]
  );

  // ── Load more for a column (infinite scroll) ─────
  const loadMoreForColumn = useCallback(
    (columnId) => {
      const meta = columnMeta[columnId];
      if (!meta || meta.loading || !meta.hasMore) return;
      fetchColumnPage(columnId, meta.page + 1, false);
    },
    [columnMeta, fetchColumnPage]
  );

  // ── Fetch all columns (initial + refresh) ────────
  const fetchAllColumns = useCallback(async () => {
    if (!workspaceId || columns.length === 0) return;
    setError(null);
    // Reset column meta
    const freshMeta = {};
    for (const col of columns) {
      freshMeta[col._id] = {
        page: 0,
        totalPages: 0,
        total: 0,
        loading: true,
        hasMore: false,
        initialLoaded: false,
      };
    }
    setColumnMeta(freshMeta);

    // Clear existing tasks
    setTaskMap({});

    // Fetch page 1 for all columns in parallel
    await Promise.all(columns.map((col) => fetchColumnPage(col._id, 1, true)));
  }, [workspaceId, columns, fetchColumnPage]);

  // ── Fetch labels ─────────────────────────────────
  const fetchLabels = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/labels`);
      setLabels(data.data.labels);
    } catch (err) {
      console.error("Failed to fetch labels:", err);
    }
  }, [workspaceId]);

  // Initial fetch when columns become available
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (columns.length > 0 && workspaceId) {
      initialFetchDone.current = true;
      fetchAllColumns();
      fetchLabels();
    }
  }, [columns.length > 0 && workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when showArchived changes
  const prevShowArchived = useRef(filters.showArchived);
  useEffect(() => {
    if (prevShowArchived.current !== filters.showArchived && initialFetchDone.current) {
      prevShowArchived.current = filters.showArchived;
      fetchAllColumns();
    }
  }, [filters.showArchived, fetchAllColumns]);

  // ── Filter tasks client-side ─────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Archive filter
      if (!filters.showArchived && task.isArchived) return false;

      // Assignee filter
      if (filters.assignee.length > 0) {
        const taskAssigneeIds = (task.assignees || []).map((a) =>
          typeof a === "string" ? a : a._id
        );
        if (!filters.assignee.some((id) => taskAssigneeIds.includes(id)))
          return false;
      }

      // Label filter
      if (filters.label.length > 0) {
        const taskLabelIds = (task.labels || []).map((l) =>
          typeof l === "string" ? l : l._id
        );
        if (!filters.label.some((id) => taskLabelIds.includes(id)))
          return false;
      }

      // Priority filter
      if (filters.priority.length > 0) {
        if (!filters.priority.includes(task.priority)) return false;
      }

      // Event filter
      if (filters.eventId) {
        const taskEventId =
          typeof task.eventId === "string"
            ? task.eventId
            : task.eventId?._id;
        if (taskEventId !== filters.eventId) return false;
      }

      // Due date range
      if (filters.dueDateFrom && task.dueDate) {
        if (new Date(task.dueDate) < new Date(filters.dueDateFrom))
          return false;
      }
      if (filters.dueDateTo && task.dueDate) {
        if (new Date(task.dueDate) > new Date(filters.dueDateTo))
          return false;
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

  // ── Group tasks by column ────────────────────────
  const tasksByColumn = useMemo(() => {
    const grouped = {};
    for (const col of columns) {
      grouped[col._id] = [];
    }
    for (const task of filteredTasks) {
      const colId =
        typeof task.columnId === "string"
          ? task.columnId
          : task.columnId?.toString();
      if (grouped[colId]) {
        grouped[colId].push(task);
      }
    }
    // Sort each column by columnOrder
    for (const colId of Object.keys(grouped)) {
      grouped[colId].sort(
        (a, b) => (a.columnOrder || 0) - (b.columnOrder || 0)
      );
    }
    return grouped;
  }, [filteredTasks, columns]);

  // ── Active filter count ──────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.assignee.length > 0) count++;
    if (filters.label.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.eventId) count++;
    if (filters.dueDateFrom || filters.dueDateTo) count++;
    if (filters.keyword.trim()) count++;
    if (filters.showArchived) count++;
    return count;
  }, [filters]);

  // ── CRUD Operations ──────────────────────────────

  const createTask = useCallback(
    async (taskData) => {
      const { data } = await api.post(
        `/workspaces/${workspaceId}/tasks`,
        taskData
      );
      const newTask = data.data.task;
      // Add to task map
      setTaskMap((prev) => ({ ...prev, [newTask._id]: newTask }));
      // Update column total
      const colId =
        typeof newTask.columnId === "string"
          ? newTask.columnId
          : newTask.columnId?.toString();
      setColumnMeta((prev) => ({
        ...prev,
        [colId]: {
          ...prev[colId],
          total: (prev[colId]?.total || 0) + 1,
        },
      }));
      return newTask;
    },
    [workspaceId]
  );

  const updateTask = useCallback(
    async (taskId, updates) => {
      // Optimistic update
      setTaskMap((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], ...updates },
      }));
      try {
        const { data } = await api.put(
          `/workspaces/${workspaceId}/tasks/${taskId}`,
          updates
        );
        // Replace with server response for accuracy
        setTaskMap((prev) => ({
          ...prev,
          [taskId]: data.data.task,
        }));
        return data.data.task;
      } catch (err) {
        // Revert on error
        await fetchAllColumns();
        throw err;
      }
    },
    [workspaceId, fetchAllColumns]
  );

  const deleteTask = useCallback(
    async (taskId) => {
      const task = taskMap[taskId];
      // Optimistic remove
      setTaskMap((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      try {
        await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
      } catch (err) {
        await fetchAllColumns();
        throw err;
      }
    },
    [workspaceId, taskMap, fetchAllColumns]
  );

  const archiveTask = useCallback(
    async (taskId) => {
      setTaskMap((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], isArchived: true },
      }));
      try {
        await api.post(
          `/workspaces/${workspaceId}/tasks/${taskId}/archive`
        );
      } catch (err) {
        await fetchAllColumns();
        throw err;
      }
    },
    [workspaceId, fetchAllColumns]
  );

  const unarchiveTask = useCallback(
    async (taskId) => {
      setTaskMap((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], isArchived: false },
      }));
      try {
        await api.post(
          `/workspaces/${workspaceId}/tasks/${taskId}/unarchive`
        );
      } catch (err) {
        await fetchAllColumns();
        throw err;
      }
    },
    [workspaceId, fetchAllColumns]
  );

  const watchTask = useCallback(
    async (taskId) => {
      await api.post(
        `/workspaces/${workspaceId}/tasks/${taskId}/watch`
      );
      // Refresh the single task
      try {
        const { data } = await api.get(
          `/workspaces/${workspaceId}/tasks/${taskId}`
        );
        setTaskMap((prev) => ({ ...prev, [taskId]: data.data.task }));
      } catch {}
    },
    [workspaceId]
  );

  const unwatchTask = useCallback(
    async (taskId) => {
      await api.delete(
        `/workspaces/${workspaceId}/tasks/${taskId}/watch`
      );
      try {
        const { data } = await api.get(
          `/workspaces/${workspaceId}/tasks/${taskId}`
        );
        setTaskMap((prev) => ({ ...prev, [taskId]: data.data.task }));
      } catch {}
    },
    [workspaceId]
  );

  // ── Move task (drag & drop) ──────────────────────
  const moveTask = useCallback(
    async (taskId, targetColumnId, newOrder) => {
      // Optimistic
      setTaskMap((prev) => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          columnId: targetColumnId,
          columnOrder: newOrder,
        },
      }));
      try {
        await api.put(`/workspaces/${workspaceId}/tasks/${taskId}`, {
          columnId: targetColumnId,
          columnOrder: newOrder,
        });
      } catch (err) {
        await fetchAllColumns();
        throw err;
      }
    },
    [workspaceId, fetchAllColumns]
  );

  // ── Reorder within column ────────────────────────
  const reorderInColumn = useCallback(
    async (columnId, reorderedTaskIds) => {
      // Optimistic: assign new orders
      setTaskMap((prev) => {
        const next = { ...prev };
        reorderedTaskIds.forEach((id, index) => {
          if (next[id]) {
            next[id] = { ...next[id], columnOrder: index };
          }
        });
        return next;
      });

      // Update each moved task on server (batch)
      try {
        await Promise.all(
          reorderedTaskIds.map((id, index) =>
            api.put(`/workspaces/${workspaceId}/tasks/${id}`, {
              columnOrder: index,
            })
          )
        );
      } catch (err) {
        await fetchAllColumns();
      }
    },
    [workspaceId, fetchAllColumns]
  );

  // ── Bulk operations ──────────────────────────────
  const bulkMoveToColumn = useCallback(
    async (taskIds, targetColumnId) => {
      await Promise.all(
        taskIds.map((id) =>
          api.put(`/workspaces/${workspaceId}/tasks/${id}`, {
            columnId: targetColumnId,
          })
        )
      );
      setSelectedTaskIds(new Set());
      await fetchAllColumns();
    },
    [workspaceId, fetchAllColumns]
  );

  const bulkUpdateField = useCallback(
    async (taskIds, field, value) => {
      await Promise.all(
        taskIds.map((id) =>
          api.put(`/workspaces/${workspaceId}/tasks/${id}`, {
            [field]: value,
          })
        )
      );
      setSelectedTaskIds(new Set());
      await fetchAllColumns();
    },
    [workspaceId, fetchAllColumns]
  );

  const bulkArchive = useCallback(
    async (taskIds) => {
      await Promise.all(
        taskIds.map((id) =>
          api.post(`/workspaces/${workspaceId}/tasks/${id}/archive`)
        )
      );
      setSelectedTaskIds(new Set());
      await fetchAllColumns();
    },
    [workspaceId, fetchAllColumns]
  );

  const bulkDelete = useCallback(
    async (taskIds) => {
      await Promise.all(
        taskIds.map((id) =>
          api.delete(`/workspaces/${workspaceId}/tasks/${id}`)
        )
      );
      setSelectedTaskIds(new Set());
      await fetchAllColumns();
    },
    [workspaceId, fetchAllColumns]
  );

  // ── Selection helpers ────────────────────────────
  const toggleTaskSelection = useCallback((taskId) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const selectAllInColumn = useCallback(
    (columnId) => {
      const columnTasks = tasksByColumn[columnId] || [];
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        columnTasks.forEach((t) => next.add(t._id));
        return next;
      });
    },
    [tasksByColumn]
  );

  // ── Socket.io real-time sync ─────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTaskCreated = ({ task }) => {
      if (!task) return;
      setTaskMap((prev) => {
        // Avoid duplicates
        if (prev[task._id]) return prev;
        return { ...prev, [task._id]: task };
      });
    };

    const handleTaskUpdated = ({ task }) => {
      if (!task) return;
      setTaskMap((prev) => ({
        ...prev,
        [task._id]: task,
      }));
    };

    const handleTaskMoved = ({ task }) => {
      if (!task) return;
      setTaskMap((prev) => ({
        ...prev,
        [task._id]: task,
      }));
    };

    const handleTaskDeleted = ({ taskId }) => {
      if (!taskId) return;
      setTaskMap((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      setActiveTaskId((prev) => (prev === taskId ? null : prev));
    };

    const handleTaskArchived = ({ taskId, isArchived }) => {
      if (!taskId) return;
      setTaskMap((prev) => {
        if (!prev[taskId]) return prev;
        return {
          ...prev,
          [taskId]: { ...prev[taskId], isArchived },
        };
      });
    };

    const handleBulkArchived = () => {
      fetchAllColumns();
    };

    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:moved", handleTaskMoved);
    socket.on("task:deleted", handleTaskDeleted);
    socket.on("task:archived", handleTaskArchived);
    socket.on("task:bulk-archived", handleBulkArchived);

    return () => {
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:moved", handleTaskMoved);
      socket.off("task:deleted", handleTaskDeleted);
      socket.off("task:archived", handleTaskArchived);
      socket.off("task:bulk-archived", handleBulkArchived);
    };
  }, [fetchAllColumns]);

  // ── Get active task data ─────────────────────────
  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return taskMap[activeTaskId] || null;
  }, [activeTaskId, taskMap]);

  return {
    // Data
    tasks: filteredTasks,
    allTasks: tasks,
    tasksByColumn,
    columns,
    labels,
    loading,
    error,
    columnMeta,

    // Filters
    filters,
    setFilters,
    activeFilterCount,

    // Pagination
    loadMoreForColumn,

    // CRUD
    createTask,
    updateTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    watchTask,
    unwatchTask,
    moveTask,
    reorderInColumn,
    fetchTasks: fetchAllColumns,
    fetchLabels,

    // Bulk
    selectedTaskIds,
    toggleTaskSelection,
    clearSelection,
    selectAllInColumn,
    bulkMoveToColumn,
    bulkUpdateField,
    bulkArchive,
    bulkDelete,

    // Detail panel
    activeTaskId,
    setActiveTaskId,
    activeTask,
  };
}
