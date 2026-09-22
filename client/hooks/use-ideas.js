"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * useIdeas — Hook inti untuk Bank Ide
 *
 * Mengambil daftar ide dengan filter, sort, dan paginasi.
 * Menangani CRUD, dukungan, serta sinkronisasi real-time Socket.io.
 */
export function useIdeas(workspaceId) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // ── Filter state ─────────────────────────────────
  const [filters, setFilters] = useState({
    status: [],
    labels: [],
    keyword: "",
    createdBy: null,
  });

  // ── Sort state ───────────────────────────────────
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // ── Fetch ────────────────────────────────────────
  const fetchIdeas = useCallback(
    async (page = 1) => {
      if (!workspaceId) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.status.length > 0) {
          params.set("status", filters.status.join(","));
        }
        if (filters.labels.length > 0) {
          params.set("labels", filters.labels.join(","));
        }
        if (filters.keyword) {
          params.set("keyword", filters.keyword);
        }
        if (filters.createdBy) {
          params.set("createdBy", filters.createdBy);
        }
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
        params.set("page", page.toString());
        params.set("limit", "50");

        const { data } = await api.get(
          `/workspaces/${workspaceId}/ideas?${params.toString()}`,
        );
        setIdeas(data.data.ideas);
        setPagination(data.data.pagination);
      } catch (err) {
        setError(err.response?.data?.message || "Gagal memuat ide");
        console.error("Failed to fetch ideas:", err);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, filters, sortBy, sortOrder],
  );

  // ── Auto-fetch saat filter atau sort berubah ─────
  useEffect(() => {
    fetchIdeas(1);
  }, [fetchIdeas]);

  // ── Sinkronisasi real-time ───────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCreated = ({ idea }) => {
      setIdeas((prev) => [idea, ...prev]);
    };

    const handleUpdated = ({ idea, partial }) => {
      setIdeas((prev) =>
        prev.map((i) =>
          i._id === idea._id ? (partial ? { ...i, ...idea } : idea) : i,
        ),
      );
    };

    const handleDeleted = ({ ideaId }) => {
      setIdeas((prev) => prev.filter((i) => i._id !== ideaId));
    };

    // Vote dipisah dari update supaya angka dukungan bisa berubah
    // tanpa menyusun ulang seluruh kartu.
    const handleVoted = ({ ideaId, voteCount }) => {
      setIdeas((prev) =>
        prev.map((i) => (i._id === ideaId ? { ...i, voteCount } : i)),
      );
    };

    socket.on("idea:created", handleCreated);
    socket.on("idea:updated", handleUpdated);
    socket.on("idea:deleted", handleDeleted);
    socket.on("idea:voted", handleVoted);

    return () => {
      socket.off("idea:created", handleCreated);
      socket.off("idea:updated", handleUpdated);
      socket.off("idea:deleted", handleDeleted);
      socket.off("idea:voted", handleVoted);
    };
  }, []);

  // ── CRUD ─────────────────────────────────────────

  const createIdea = useCallback(
    async (ideaData) => {
      const { data } = await api.post(
        `/workspaces/${workspaceId}/ideas`,
        ideaData,
      );
      return data.data.idea;
    },
    [workspaceId],
  );

  const updateIdea = useCallback(
    async (ideaId, updates) => {
      const { data } = await api.put(
        `/workspaces/${workspaceId}/ideas/${ideaId}`,
        updates,
      );
      return data.data.idea;
    },
    [workspaceId],
  );

  const deleteIdea = useCallback(
    async (ideaId) => {
      await api.delete(`/workspaces/${workspaceId}/ideas/${ideaId}`);
    },
    [workspaceId],
  );

  const getIdea = useCallback(
    async (ideaId) => {
      const { data } = await api.get(
        `/workspaces/${workspaceId}/ideas/${ideaId}`,
      );
      return data.data.idea;
    },
    [workspaceId],
  );

  // ── Dukungan ─────────────────────────────────────

  const voteIdea = useCallback(
    async (ideaId) => {
      const { data } = await api.post(
        `/workspaces/${workspaceId}/ideas/${ideaId}/vote`,
      );
      return data.data;
    },
    [workspaceId],
  );

  const unvoteIdea = useCallback(
    async (ideaId) => {
      const { data } = await api.delete(
        `/workspaces/${workspaceId}/ideas/${ideaId}/vote`,
      );
      return data.data;
    },
    [workspaceId],
  );

  return {
    ideas,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    fetchIdeas,
    createIdea,
    updateIdea,
    deleteIdea,
    getIdea,
    voteIdea,
    unvoteIdea,
  };
}
