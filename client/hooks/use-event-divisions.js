"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * useEventDivisions — Hook for Event Division CRUD, member management, + real-time sync
 * All mutations use optimistic updates: UI changes instantly, reverts on API error.
 */
export function useEventDivisions(workspaceId, eventId) {
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const wsRef = useRef(workspaceId);
  const evRef = useRef(eventId);
  wsRef.current = workspaceId;
  evRef.current = eventId;

  const basePath = `/workspaces/${workspaceId}/events/${eventId}/divisions`;

  const fetchDivisions = useCallback(async () => {
    if (!workspaceId || !eventId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(basePath);
      setDivisions(data.data.divisions);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat divisi");
      console.error("Failed to fetch event divisions:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, eventId, basePath]);

  useEffect(() => {
    fetchDivisions();
  }, [fetchDivisions]);

  // Socket.io real-time sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCreated = ({ eventId: evId, division }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) => {
        if (prev.some((d) => d._id === division._id)) {
          return prev.map((d) => (d._id === division._id ? division : d));
        }
        return [...prev, division];
      });
    };

    const handleUpdated = ({ eventId: evId, division }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) =>
        prev.map((d) => (d._id === division._id ? division : d)),
      );
    };

    const handleDeleted = ({ eventId: evId, divisionId }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) => prev.filter((d) => d._id !== divisionId));
    };

    const handleMemberChange = ({ eventId: evId, division }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) =>
        prev.map((d) => (d._id === division._id ? division : d)),
      );
    };

    const handleMemberMoved = ({
      eventId: evId,
      sourceDivision,
      targetDivision,
    }) => {
      if (evId !== evRef.current) return;
      setDivisions((prev) =>
        prev.map((d) => {
          if (d._id === sourceDivision._id) return sourceDivision;
          if (d._id === targetDivision._id) return targetDivision;
          return d;
        }),
      );
    };

    socket.on("event:division:created", handleCreated);
    socket.on("event:division:updated", handleUpdated);
    socket.on("event:division:deleted", handleDeleted);
    socket.on("event:division:member:added", handleMemberChange);
    socket.on("event:division:member:removed", handleMemberChange);
    socket.on("event:division:member:updated", handleMemberChange);
    socket.on("event:division:member:moved", handleMemberMoved);

    return () => {
      socket.off("event:division:created", handleCreated);
      socket.off("event:division:updated", handleUpdated);
      socket.off("event:division:deleted", handleDeleted);
      socket.off("event:division:member:added", handleMemberChange);
      socket.off("event:division:member:removed", handleMemberChange);
      socket.off("event:division:member:updated", handleMemberChange);
      socket.off("event:division:member:moved", handleMemberMoved);
    };
  }, []);

  // ── Division CRUD (optimistic) ─────────────────────

  const createDivision = useCallback(
    async (divisionData) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        _id: tempId,
        eventId,
        workspaceId,
        name: divisionData.name,
        description: divisionData.description || "",
        color: divisionData.color || null,
        members: [],
        order: divisionData.order ?? divisions.length,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setDivisions((prev) => [...prev, optimistic]);

      try {
        const { data } = await api.post(basePath, divisionData);
        const real = data.data.division;
        setDivisions((prev) =>
          prev.map((d) => (d._id === tempId ? real : d)),
        );
        return real;
      } catch (err) {
        setDivisions((prev) => prev.filter((d) => d._id !== tempId));
        throw err;
      }
    },
    [basePath, eventId, workspaceId, divisions.length],
  );

  const updateDivision = useCallback(
    async (divisionId, updates) => {
      let snapshot;
      setDivisions((prev) => {
        snapshot = prev;
        return prev.map((d) =>
          d._id === divisionId ? { ...d, ...updates } : d,
        );
      });

      try {
        const { data } = await api.put(`${basePath}/${divisionId}`, updates);
        const real = data.data.division;
        setDivisions((prev) =>
          prev.map((d) => (d._id === divisionId ? real : d)),
        );
        return real;
      } catch (err) {
        if (snapshot) setDivisions(snapshot);
        throw err;
      }
    },
    [basePath],
  );

  const deleteDivision = useCallback(
    async (divisionId) => {
      let snapshot;
      setDivisions((prev) => {
        snapshot = prev;
        return prev.filter((d) => d._id !== divisionId);
      });

      try {
        await api.delete(`${basePath}/${divisionId}`);
      } catch (err) {
        if (snapshot) setDivisions(snapshot);
        throw err;
      }
    },
    [basePath],
  );

  // ── Member operations (optimistic) ─────────────────

  const addMember = useCallback(
    async (divisionId, memberId, role = "member") => {
      let snapshot;
      setDivisions((prev) => {
        snapshot = prev;
        return prev.map((d) => {
          if (d._id !== divisionId) return d;
          return {
            ...d,
            members: [
              ...d.members,
              { userId: { _id: memberId, name: "...", email: "" }, role },
            ],
          };
        });
      });

      try {
        const { data } = await api.post(
          `${basePath}/${divisionId}/members`,
          { memberId, role },
        );
        const real = data.data.division;
        setDivisions((prev) =>
          prev.map((d) => (d._id === divisionId ? real : d)),
        );
        return real;
      } catch (err) {
        if (snapshot) setDivisions(snapshot);
        throw err;
      }
    },
    [basePath],
  );

  const updateMemberRole = useCallback(
    async (divisionId, userId, role) => {
      let snapshot;
      setDivisions((prev) => {
        snapshot = prev;
        return prev.map((d) => {
          if (d._id !== divisionId) return d;
          return {
            ...d,
            members: d.members.map((m) => {
              const uid = (m.userId?._id || m.userId).toString();
              return uid === userId ? { ...m, role } : m;
            }),
          };
        });
      });

      try {
        const { data } = await api.put(
          `${basePath}/${divisionId}/members/${userId}`,
          { role },
        );
        const real = data.data.division;
        setDivisions((prev) =>
          prev.map((d) => (d._id === divisionId ? real : d)),
        );
        return real;
      } catch (err) {
        if (snapshot) setDivisions(snapshot);
        throw err;
      }
    },
    [basePath],
  );

  const removeMember = useCallback(
    async (divisionId, userId) => {
      let snapshot;
      setDivisions((prev) => {
        snapshot = prev;
        return prev.map((d) => {
          if (d._id !== divisionId) return d;
          return {
            ...d,
            members: d.members.filter(
              (m) => (m.userId?._id || m.userId).toString() !== userId,
            ),
          };
        });
      });

      try {
        const { data } = await api.delete(
          `${basePath}/${divisionId}/members/${userId}`,
        );
        const real = data.data.division;
        setDivisions((prev) =>
          prev.map((d) => (d._id === divisionId ? real : d)),
        );
        return real;
      } catch (err) {
        if (snapshot) setDivisions(snapshot);
        throw err;
      }
    },
    [basePath],
  );

  const moveMember = useCallback(
    async (divisionId, userId, targetDivisionId) => {
      let snapshot;
      setDivisions((prev) => {
        snapshot = prev;
        const sourceDivision = prev.find((d) => d._id === divisionId);
        const movedMember = sourceDivision?.members.find(
          (m) => (m.userId?._id || m.userId).toString() === userId,
        );
        if (!movedMember) return prev;

        return prev.map((d) => {
          if (d._id === divisionId) {
            return {
              ...d,
              members: d.members.filter(
                (m) => (m.userId?._id || m.userId).toString() !== userId,
              ),
            };
          }
          if (d._id === targetDivisionId) {
            return { ...d, members: [...d.members, movedMember] };
          }
          return d;
        });
      });

      try {
        const { data } = await api.post(
          `${basePath}/${divisionId}/members/${userId}/move`,
          { targetDivisionId },
        );
        const { sourceDivision, targetDivision } = data.data;
        setDivisions((prev) =>
          prev.map((d) => {
            if (d._id === sourceDivision._id) return sourceDivision;
            if (d._id === targetDivision._id) return targetDivision;
            return d;
          }),
        );
        return data.data;
      } catch (err) {
        if (snapshot) setDivisions(snapshot);
        throw err;
      }
    },
    [basePath],
  );

  return {
    divisions,
    loading,
    error,
    fetchDivisions,
    createDivision,
    updateDivision,
    deleteDivision,
    addMember,
    updateMemberRole,
    removeMember,
    moveMember,
  };
}
