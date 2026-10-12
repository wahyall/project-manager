"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

function applyOp(divisions, op) {
  switch (op.type) {
    case "createDivision":
      return [...divisions, op.optimistic];

    case "updateDivision":
      return divisions.map((d) =>
        d._id === op.divisionId ? { ...d, ...op.updates } : d,
      );

    case "deleteDivision":
      return divisions.filter((d) => d._id !== op.divisionId);

    case "addMember":
      return divisions.map((d) => {
        if (d._id !== op.divisionId) return d;
        const exists = d.members.some(
          (m) => (m.userId?._id || m.userId).toString() === op.memberId,
        );
        if (exists) return d;
        return {
          ...d,
          members: [
            ...d.members,
            { userId: { _id: op.memberId, name: "...", email: "" }, role: op.role },
          ],
        };
      });

    case "removeMember":
      return divisions.map((d) => {
        if (d._id !== op.divisionId) return d;
        return {
          ...d,
          members: d.members.filter(
            (m) => (m.userId?._id || m.userId).toString() !== op.userId,
          ),
        };
      });

    case "updateMemberRole":
      return divisions.map((d) => {
        if (d._id !== op.divisionId) return d;
        return {
          ...d,
          members: d.members.map((m) => {
            const uid = (m.userId?._id || m.userId).toString();
            return uid === op.userId ? { ...m, role: op.role } : m;
          }),
        };
      });

    case "moveMember": {
      const src = divisions.find((d) => d._id === op.divisionId);
      const member = src?.members.find(
        (m) => (m.userId?._id || m.userId).toString() === op.userId,
      );
      if (!member) return divisions;
      return divisions.map((d) => {
        if (d._id === op.divisionId) {
          return {
            ...d,
            members: d.members.filter(
              (m) => (m.userId?._id || m.userId).toString() !== op.userId,
            ),
          };
        }
        if (d._id === op.targetDivisionId) {
          return { ...d, members: [...d.members, member] };
        }
        return d;
      });
    }

    default:
      return divisions;
  }
}

/**
 * useWorkspaceDivisions — Hook untuk Divisi Workspace (bukan Divisi Event).
 * CRUD divisi (Nama + Warna), kelola member, assign ketua (leader),
 * + real-time sync via socket.io dengan optimistic updates.
 */
export function useWorkspaceDivisions(workspaceId) {
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const wsRef = useRef(workspaceId);
  wsRef.current = workspaceId;

  const pendingOpsRef = useRef([]);
  const opIdRef = useRef(0);
  const serverStateRef = useRef([]);

  const basePath = `/workspaces/${workspaceId}/divisions`;

  const reconcile = useCallback((serverState) => {
    serverStateRef.current = serverState;
    setDivisions(
      pendingOpsRef.current.reduce((divs, op) => applyOp(divs, op), serverState),
    );
  }, []);

  const updateServerState = useCallback(
    (transformer) => {
      const prev = serverStateRef.current;
      const next =
        typeof transformer === "function" ? transformer(prev) : transformer;
      reconcile(next);
    },
    [reconcile],
  );

  const addOp = useCallback((op) => {
    const id = ++opIdRef.current;
    const pending = { ...op, _opId: id };
    pendingOpsRef.current = [...pendingOpsRef.current, pending];
    setDivisions((prev) => applyOp(prev, pending));
    return id;
  }, []);

  const removeOp = useCallback((opId) => {
    pendingOpsRef.current = pendingOpsRef.current.filter(
      (op) => op._opId !== opId,
    );
  }, []);

  const revertOp = useCallback(
    (opId) => {
      removeOp(opId);
      reconcile(serverStateRef.current);
    },
    [removeOp, reconcile],
  );

  // ── Fetch ────────────────────────────────────────────

  const fetchDivisions = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(basePath);
      reconcile(data.data.divisions);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat divisi workspace");
      console.error("Failed to fetch workspace divisions:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, basePath, reconcile]);

  useEffect(() => {
    fetchDivisions();
  }, [fetchDivisions]);

  // ── Socket.io real-time sync ─────────────────────────

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCreated = ({ division }) => {
      updateServerState((prev) => {
        if (prev.some((d) => d._id === division._id)) {
          return prev.map((d) => (d._id === division._id ? division : d));
        }
        return [...prev, division];
      });
    };

    const handleUpdated = ({ division }) => {
      updateServerState((prev) =>
        prev.map((d) => (d._id === division._id ? division : d)),
      );
    };

    const handleDeleted = ({ divisionId }) => {
      updateServerState((prev) => prev.filter((d) => d._id !== divisionId));
    };

    const handleMemberChange = ({ division }) => {
      updateServerState((prev) =>
        prev.map((d) => (d._id === division._id ? division : d)),
      );
    };

    const handleMemberMoved = ({ sourceDivision, targetDivision }) => {
      updateServerState((prev) =>
        prev.map((d) => {
          if (d._id === sourceDivision._id) return sourceDivision;
          if (d._id === targetDivision._id) return targetDivision;
          return d;
        }),
      );
    };

    socket.on("workspace:division:created", handleCreated);
    socket.on("workspace:division:updated", handleUpdated);
    socket.on("workspace:division:deleted", handleDeleted);
    socket.on("workspace:division:member:added", handleMemberChange);
    socket.on("workspace:division:member:removed", handleMemberChange);
    socket.on("workspace:division:member:updated", handleMemberChange);
    socket.on("workspace:division:member:moved", handleMemberMoved);

    return () => {
      socket.off("workspace:division:created", handleCreated);
      socket.off("workspace:division:updated", handleUpdated);
      socket.off("workspace:division:deleted", handleDeleted);
      socket.off("workspace:division:member:added", handleMemberChange);
      socket.off("workspace:division:member:removed", handleMemberChange);
      socket.off("workspace:division:member:updated", handleMemberChange);
      socket.off("workspace:division:member:moved", handleMemberMoved);
    };
  }, [updateServerState]);

  // ── Division CRUD (optimistic) ─────────────────────

  const createDivision = useCallback(
    async (divisionData) => {
      const tempId = `temp-${Date.now()}`;
      const opId = addOp({
        type: "createDivision",
        tempId,
        optimistic: {
          _id: tempId,
          workspaceId,
          name: divisionData.name,
          description: divisionData.description || "",
          color: divisionData.color || null,
          members: [],
          order: divisionData.order ?? serverStateRef.current.length,
          createdBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      try {
        const { data } = await api.post(basePath, divisionData);
        const real = data.data.division;
        removeOp(opId);
        updateServerState((prev) => [...prev, real]);
        return real;
      } catch (err) {
        revertOp(opId);
        throw err;
      }
    },
    [basePath, workspaceId, addOp, removeOp, revertOp, updateServerState],
  );

  const updateDivision = useCallback(
    async (divisionId, updates) => {
      const opId = addOp({ type: "updateDivision", divisionId, updates });

      try {
        const { data } = await api.put(`${basePath}/${divisionId}`, updates);
        const real = data.data.division;
        removeOp(opId);
        updateServerState((prev) =>
          prev.map((d) => (d._id === divisionId ? real : d)),
        );
        return real;
      } catch (err) {
        revertOp(opId);
        throw err;
      }
    },
    [basePath, addOp, removeOp, revertOp, updateServerState],
  );

  const deleteDivision = useCallback(
    async (divisionId) => {
      const opId = addOp({ type: "deleteDivision", divisionId });

      try {
        await api.delete(`${basePath}/${divisionId}`);
        removeOp(opId);
        updateServerState((prev) =>
          prev.filter((d) => d._id !== divisionId),
        );
      } catch (err) {
        revertOp(opId);
        throw err;
      }
    },
    [basePath, addOp, removeOp, revertOp, updateServerState],
  );

  // ── Member operations (optimistic) ─────────────────

  const addMember = useCallback(
    async (divisionId, memberId, role = "member") => {
      const opId = addOp({ type: "addMember", divisionId, memberId, role });

      try {
        const { data } = await api.post(
          `${basePath}/${divisionId}/members`,
          { memberId, role },
        );
        const real = data.data.division;
        removeOp(opId);
        updateServerState((prev) =>
          prev.map((d) => (d._id === divisionId ? real : d)),
        );
        return real;
      } catch (err) {
        revertOp(opId);
        throw err;
      }
    },
    [basePath, addOp, removeOp, revertOp, updateServerState],
  );

  const updateMemberRole = useCallback(
    async (divisionId, userId, role) => {
      const opId = addOp({
        type: "updateMemberRole",
        divisionId,
        userId,
        role,
      });

      try {
        const { data } = await api.put(
          `${basePath}/${divisionId}/members/${userId}`,
          { role },
        );
        const real = data.data.division;
        removeOp(opId);
        updateServerState((prev) =>
          prev.map((d) => (d._id === divisionId ? real : d)),
        );
        return real;
      } catch (err) {
        revertOp(opId);
        throw err;
      }
    },
    [basePath, addOp, removeOp, revertOp, updateServerState],
  );

  const removeMember = useCallback(
    async (divisionId, userId) => {
      const opId = addOp({ type: "removeMember", divisionId, userId });

      try {
        const { data } = await api.delete(
          `${basePath}/${divisionId}/members/${userId}`,
        );
        const real = data.data.division;
        removeOp(opId);
        updateServerState((prev) =>
          prev.map((d) => (d._id === divisionId ? real : d)),
        );
        return real;
      } catch (err) {
        revertOp(opId);
        throw err;
      }
    },
    [basePath, addOp, removeOp, revertOp, updateServerState],
  );

  const moveMember = useCallback(
    async (divisionId, userId, targetDivisionId) => {
      const opId = addOp({
        type: "moveMember",
        divisionId,
        userId,
        targetDivisionId,
      });

      try {
        const { data } = await api.post(
          `${basePath}/${divisionId}/members/${userId}/move`,
          { targetDivisionId },
        );
        const { sourceDivision, targetDivision } = data.data;
        removeOp(opId);
        updateServerState((prev) =>
          prev.map((d) => {
            if (d._id === sourceDivision._id) return sourceDivision;
            if (d._id === targetDivision._id) return targetDivision;
            return d;
          }),
        );
        return data.data;
      } catch (err) {
        revertOp(opId);
        throw err;
      }
    },
    [basePath, addOp, removeOp, revertOp, updateServerState],
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
