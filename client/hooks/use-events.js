"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * useEvents — Core hook for Event management
 *
 * Fetches events with filtering, sorting, pagination,
 * handles CRUD, participant management, and Socket.io real-time sync.
 *
 * @param {string} workspaceId
 * @param {Object} [scopeGuard] - Guard realtime agar member terkunci tidak
 *   melihat event divisi lain: { divisionIds: string[]|null, includeNone: bool }
 *   divisionIds null = tak terbatas (owner/admin).
 */
export function useEvents(workspaceId, scopeGuard = null) {
  const [events, setEvents] = useState([]);
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
    participant: null,
    startDateFrom: null,
    startDateTo: null,
    keyword: "",
  });

  // ── Division scope ───────────────────────────────
  // undefined = ikut scope server (all utk owner/admin, divisinya utk member),
  // "none" = Tanpa Divisi, id = divisi spesifik.
  const [divisionId, setDivisionId] = useState(undefined);

  // ── Sort state ───────────────────────────────────
  const [sortBy, setSortBy] = useState("startDate");
  const [sortOrder, setSortOrder] = useState("desc");

  // Track current workspaceId for cleanup
  const wsRef = useRef(workspaceId);
  wsRef.current = workspaceId;

  // ── Fetch events ─────────────────────────────────
  const fetchEvents = useCallback(
    async (page = 1) => {
      if (!workspaceId) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.status.length > 0) {
          params.set("status", filters.status.join(","));
        }
        if (filters.participant) {
          params.set("participant", filters.participant);
        }
        if (filters.startDateFrom) {
          params.set("startDateFrom", filters.startDateFrom);
        }
        if (filters.startDateTo) {
          params.set("startDateTo", filters.startDateTo);
        }
        if (filters.keyword) {
          params.set("keyword", filters.keyword);
        }
        if (divisionId) {
          params.set("divisionId", divisionId);
        }
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
        params.set("page", page.toString());
        params.set("limit", "50");

        const { data } = await api.get(
          `/workspaces/${workspaceId}/events?${params.toString()}`,
        );
        setEvents(data.data.events);
        setPagination(data.data.pagination);
      } catch (err) {
        setError(err.response?.data?.message || "Gagal memuat events");
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, filters, sortBy, sortOrder, divisionId],
  );

  // ── Auto-fetch on filter/sort change ─────────────
  useEffect(() => {
    fetchEvents(1);
  }, [fetchEvents]);

  // ── Socket.io real-time sync ─────────────────────
  const guardRef = useRef(scopeGuard);
  guardRef.current = scopeGuard;

  const isInScope = useCallback((event) => {
    const guard = guardRef.current;
    if (!guard || guard.divisionIds === null) return true;
    const divId =
      typeof event?.divisionId === "string"
        ? event.divisionId
        : event?.divisionId?._id?.toString();
    if (!divId) return guard.includeNone !== false;
    return guard.divisionIds.includes(divId);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCreated = ({ event: newEvent }) => {
      if (!isInScope(newEvent)) return;
      setEvents((prev) => [newEvent, ...prev]);
    };

    const handleUpdated = ({ event: updatedEvent }) => {
      if (!isInScope(updatedEvent)) {
        // Keluar dari scope (mis. pindah divisi) → hilangkan dari daftar
        setEvents((prev) => prev.filter((e) => e._id !== updatedEvent._id));
        return;
      }
      setEvents((prev) =>
        prev.map((e) => (e._id === updatedEvent._id ? updatedEvent : e)),
      );
    };

    const handleDeleted = ({ eventId }) => {
      setEvents((prev) => prev.filter((e) => e._id !== eventId));
    };

    socket.on("event:created", handleCreated);
    socket.on("event:updated", handleUpdated);
    socket.on("event:deleted", handleDeleted);

    return () => {
      socket.off("event:created", handleCreated);
      socket.off("event:updated", handleUpdated);
      socket.off("event:deleted", handleDeleted);
    };
  }, [isInScope]);

  // ── CRUD Operations ──────────────────────────────

  const createEvent = useCallback(
    async (eventData) => {
      const { data } = await api.post(
        `/workspaces/${workspaceId}/events`,
        eventData,
      );
      return data.data.event;
    },
    [workspaceId],
  );

  const updateEvent = useCallback(
    async (eventId, updates) => {
      const { data } = await api.put(
        `/workspaces/${workspaceId}/events/${eventId}`,
        updates,
      );
      return data.data.event;
    },
    [workspaceId],
  );

  const deleteEvent = useCallback(
    async (eventId) => {
      await api.delete(`/workspaces/${workspaceId}/events/${eventId}`);
    },
    [workspaceId],
  );

  const getEvent = useCallback(
    async (eventId) => {
      const { data } = await api.get(
        `/workspaces/${workspaceId}/events/${eventId}`,
      );
      return data.data.event;
    },
    [workspaceId],
  );

  // ── Event tasks ──────────────────────────────────

  const getEventTasks = useCallback(
    async (eventId) => {
      const { data } = await api.get(
        `/workspaces/${workspaceId}/events/${eventId}/tasks`,
      );
      return data.data.tasks;
    },
    [workspaceId],
  );

  return {
    events,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    divisionId,
    setDivisionId,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEvent,
    getEventTasks,
  };
}

