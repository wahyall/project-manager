"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * useBoards — Hook for board list management
 */
export function useBoards(workspaceId) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch boards ──────────────────────────────────
  const fetchBoards = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/boards`);
      setBoards(data.data.boards);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat boards");
      console.error("Failed to fetch boards:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // ── Auto-fetch on mount ───────────────────────────
  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // ── Socket.io real-time sync ──────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCreated = ({ board }) => {
      setBoards((prev) => [board, ...prev]);
    };

    const handleUpdated = ({ board }) => {
      setBoards((prev) =>
        prev.map((b) => (b._id === board._id ? { ...b, ...board } : b)),
      );
    };

    const handleDeleted = ({ boardId }) => {
      setBoards((prev) => prev.filter((b) => b._id !== boardId));
    };

    socket.on("board:created", handleCreated);
    socket.on("board:updated", handleUpdated);
    socket.on("board:deleted", handleDeleted);

    return () => {
      socket.off("board:created", handleCreated);
      socket.off("board:updated", handleUpdated);
      socket.off("board:deleted", handleDeleted);
    };
  }, []);

  // ── CRUD Operations ───────────────────────────────
  const createBoard = useCallback(
    async (name) => {
      const { data } = await api.post(`/workspaces/${workspaceId}/boards`, {
        name,
      });
      return data.data.board;
    },
    [workspaceId],
  );

  const updateBoard = useCallback(
    async (boardId, updates) => {
      const { data } = await api.put(
        `/workspaces/${workspaceId}/boards/${boardId}`,
        updates,
      );
      return data.data.board;
    },
    [workspaceId],
  );

  const deleteBoard = useCallback(
    async (boardId) => {
      await api.delete(`/workspaces/${workspaceId}/boards/${boardId}`);
    },
    [workspaceId],
  );

  const duplicateBoard = useCallback(
    async (boardId) => {
      const { data } = await api.post(
        `/workspaces/${workspaceId}/boards/${boardId}/duplicate`,
      );
      return data.data.board;
    },
    [workspaceId],
  );

  return {
    boards,
    loading,
    error,
    fetchBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    duplicateBoard,
  };
}

/**
 * useBoard — Hook for single board (canvas) management
 * Manages widgets, connections, and real-time sync via socket.
 */
export function useBoard(workspaceId, boardId) {
  const [board, setBoard] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const boardIdRef = useRef(boardId);
  boardIdRef.current = boardId;

  // ── Fetch board detail ────────────────────────────
  const fetchBoard = useCallback(async () => {
    if (!workspaceId || !boardId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/workspaces/${workspaceId}/boards/${boardId}`,
      );
      setBoard(data.data.board);
      setWidgets(data.data.widgets);
      setConnections(data.data.connections);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat board");
      console.error("Failed to fetch board:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, boardId]);

  // ── Auto-fetch + join board room ──────────────────
  useEffect(() => {
    fetchBoard();

    const socket = getSocket();
    if (socket && boardId) {
      socket.emit("board:join", boardId);
    }

    return () => {
      if (socket && boardId) {
        socket.emit("board:leave", boardId);
      }
    };
  }, [fetchBoard, boardId]);

  // ── Socket.io real-time sync ──────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Widget events
    const handleWidgetAdded = ({ widget }) => {
      setWidgets((prev) => {
        if (prev.some((w) => w._id === widget._id)) return prev;
        return [...prev, widget];
      });
    };

    const handleWidgetUpdated = ({
      widgetId,
      changes,
      widget: updatedWidget,
    }) => {
      setWidgets((prev) =>
        prev.map((w) =>
          w._id === widgetId ? updatedWidget || { ...w, ...changes } : w,
        ),
      );
    };

    const handleWidgetMoved = ({ widgetId, x, y }) => {
      setWidgets((prev) =>
        prev.map((w) => (w._id === widgetId ? { ...w, x, y } : w)),
      );
    };

    const handleWidgetResized = ({ widgetId, width, height }) => {
      setWidgets((prev) =>
        prev.map((w) => (w._id === widgetId ? { ...w, width, height } : w)),
      );
    };

    const handleWidgetDeleted = ({ widgetId }) => {
      setWidgets((prev) => prev.filter((w) => w._id !== widgetId));
      setConnections((prev) =>
        prev.filter(
          (c) => c.fromWidgetId !== widgetId && c.toWidgetId !== widgetId,
        ),
      );
    };

    // Connection events
    const handleConnectionAdded = ({ connection }) => {
      setConnections((prev) => {
        if (prev.some((c) => c._id === connection._id)) return prev;
        return [...prev, connection];
      });
    };

    const handleConnectionUpdated = ({ connectionId, connection }) => {
      setConnections((prev) =>
        prev.map((c) => (c._id === connectionId ? connection : c)),
      );
    };

    const handleConnectionDeleted = ({ connectionId }) => {
      setConnections((prev) => prev.filter((c) => c._id !== connectionId));
    };

    socket.on("board:widget:added", handleWidgetAdded);
    socket.on("board:widget:updated", handleWidgetUpdated);
    socket.on("board:widget:moved", handleWidgetMoved);
    socket.on("board:widget:resized", handleWidgetResized);
    socket.on("board:widget:deleted", handleWidgetDeleted);
    socket.on("board:connection:added", handleConnectionAdded);
    socket.on("board:connection:updated", handleConnectionUpdated);
    socket.on("board:connection:deleted", handleConnectionDeleted);

    return () => {
      socket.off("board:widget:added", handleWidgetAdded);
      socket.off("board:widget:updated", handleWidgetUpdated);
      socket.off("board:widget:moved", handleWidgetMoved);
      socket.off("board:widget:resized", handleWidgetResized);
      socket.off("board:widget:deleted", handleWidgetDeleted);
      socket.off("board:connection:added", handleConnectionAdded);
      socket.off("board:connection:updated", handleConnectionUpdated);
      socket.off("board:connection:deleted", handleConnectionDeleted);
    };
  }, []);

  // ── Widget Operations ─────────────────────────────
  const addWidget = useCallback(
    async (widgetData) => {
      const { data } = await api.post(
        `/workspaces/${workspaceId}/boards/${boardId}/widgets`,
        widgetData,
      );
      return data.data.widget;
    },
    [workspaceId, boardId],
  );

  const updateWidget = useCallback(
    async (widgetId, updates) => {
      const { data } = await api.put(
        `/workspaces/${workspaceId}/boards/${boardId}/widgets/${widgetId}`,
        updates,
      );
      return data.data.widget;
    },
    [workspaceId, boardId],
  );

  const deleteWidget = useCallback(
    async (widgetId) => {
      await api.delete(
        `/workspaces/${workspaceId}/boards/${boardId}/widgets/${widgetId}`,
      );
    },
    [workspaceId, boardId],
  );

  // ── Connection Operations ─────────────────────────
  const addConnection = useCallback(
    async (connectionData) => {
      const { data } = await api.post(
        `/workspaces/${workspaceId}/boards/${boardId}/connections`,
        connectionData,
      );
      return data.data.connection;
    },
    [workspaceId, boardId],
  );

  const updateConnection = useCallback(
    async (connId, updates) => {
      const { data } = await api.put(
        `/workspaces/${workspaceId}/boards/${boardId}/connections/${connId}`,
        updates,
      );
      return data.data.connection;
    },
    [workspaceId, boardId],
  );

  const deleteConnection = useCallback(
    async (connId) => {
      await api.delete(
        `/workspaces/${workspaceId}/boards/${boardId}/connections/${connId}`,
      );
    },
    [workspaceId, boardId],
  );

  return {
    board,
    widgets,
    connections,
    loading,
    error,
    fetchBoard,
    addWidget,
    updateWidget,
    deleteWidget,
    addConnection,
    updateConnection,
    deleteConnection,
  };
}
