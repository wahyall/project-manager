"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { PHASES } from "@/lib/pipeline-phases";

function emptyPhases() {
  return PHASES.map((phase) => ({
    phase,
    tasks: [],
    progress: { done: 0, total: 0 },
  }));
}

export function useEventPipeline(workspaceId, eventId) {
  const [phases, setPhases] = useState(emptyPhases());
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);

  const basePath = `/workspaces/${workspaceId}/events/${eventId}/pipeline`;
  const tasksBasePath = `/workspaces/${workspaceId}/tasks`;

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(basePath);
      setPhases(res.data.data.phases);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  const fetchLabels = useCallback(async () => {
    const res = await api.get(`/workspaces/${workspaceId}/labels`);
    setLabels(res.data.data.labels);
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId && eventId) {
      fetchPipeline();
      fetchLabels();
    }
  }, [workspaceId, eventId, fetchPipeline, fetchLabels]);

  // Task shown in the detail side panel — TaskDetailPanel takes the full
  // task object (not an id it fetches itself), so find it from local state.
  const activeTask = phases
    .flatMap((p) => p.tasks)
    .find((t) => t._id === activeTaskId) || null;

  // ── All tasks belonging to this event's pipeline, flat ──
  const allTaskIds = useRef(new Set());
  useEffect(() => {
    allTaskIds.current = new Set(
      phases.flatMap((p) => p.tasks.map((t) => t._id)),
    );
  }, [phases]);

  const createTask = useCallback(
    async (phase, taskData) => {
      const res = await api.post(`${basePath}/tasks`, { ...taskData, phase });
      await fetchPipeline();
      return res.data.data.task;
    },
    [basePath, fetchPipeline],
  );

  const moveTaskPhase = useCallback(
    async (taskId, newPhase) => {
      // Optimistic: move the task object between phase buckets locally
      setPhases((prev) => {
        let moved = null;
        const withoutTask = prev.map((p) => {
          const found = p.tasks.find((t) => t._id === taskId);
          if (found) moved = found;
          return { ...p, tasks: p.tasks.filter((t) => t._id !== taskId) };
        });
        if (!moved) return prev;
        return withoutTask.map((p) =>
          p.phase === newPhase
            ? { ...p, tasks: [...p.tasks, { ...moved, phase: newPhase }] }
            : p,
        );
      });
      try {
        await api.put(`/workspaces/${workspaceId}/tasks/${taskId}`, {
          phase: newPhase,
        });
      } catch (err) {
        await fetchPipeline();
        throw err;
      }
    },
    [workspaceId, fetchPipeline],
  );

  // ── Generic task mutations, needed to feed TaskDetailPanel's
  // onUpdate/onDelete/onArchive/onUnarchive/onWatch/onUnwatch props ──
  const updateTask = useCallback(
    async (taskId, updates) => {
      await api.put(`${tasksBasePath}/${taskId}`, updates);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const deleteTask = useCallback(
    async (taskId) => {
      await api.delete(`${tasksBasePath}/${taskId}`);
      setActiveTaskId(null);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const archiveTask = useCallback(
    async (taskId) => {
      await api.post(`${tasksBasePath}/${taskId}/archive`);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const unarchiveTask = useCallback(
    async (taskId) => {
      await api.post(`${tasksBasePath}/${taskId}/unarchive`);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const watchTask = useCallback(
    async (taskId) => {
      await api.post(`${tasksBasePath}/${taskId}/watch`);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const unwatchTask = useCallback(
    async (taskId) => {
      await api.delete(`${tasksBasePath}/${taskId}/watch`);
      await fetchPipeline();
    },
    [tasksBasePath, fetchPipeline],
  );

  const applyTemplate = useCallback(
    async (templateId) => {
      await api.post(`${basePath}/apply-template`, { templateId });
      await fetchPipeline();
    },
    [basePath, fetchPipeline],
  );

  const saveAsTemplate = useCallback(
    async (name, description) => {
      const res = await api.post(`${basePath}/save-as-template`, {
        name,
        description,
      });
      return res.data.data.template;
    },
    [basePath],
  );

  // ── Real-time sync ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const isOurs = (task) => task?.eventId?.toString?.() === eventId || task?.eventId === eventId;

    const handleTaskCreated = ({ task }) => {
      if (!task || task.phase == null || !isOurs(task)) return;
      fetchPipeline();
    };
    const handleTaskUpdated = ({ task }) => {
      if (!task) return;
      if (task.phase != null && isOurs(task)) {
        fetchPipeline();
      } else if (allTaskIds.current.has(task._id)) {
        // Task used to be in our pipeline (phase cleared, or moved off-event)
        fetchPipeline();
      }
    };
    const handleTaskDeleted = ({ taskId }) => {
      if (allTaskIds.current.has(taskId)) fetchPipeline();
    };

    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:moved", handleTaskUpdated);
    socket.on("task:deleted", handleTaskDeleted);

    return () => {
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:moved", handleTaskUpdated);
      socket.off("task:deleted", handleTaskDeleted);
    };
  }, [eventId, fetchPipeline]);

  return {
    phases,
    labels,
    loading,
    error,
    activeTaskId,
    setActiveTaskId,
    activeTask,
    createTask,
    moveTaskPhase,
    updateTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    watchTask,
    unwatchTask,
    applyTemplate,
    saveAsTemplate,
    refetch: fetchPipeline,
  };
}
