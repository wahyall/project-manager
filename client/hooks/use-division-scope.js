"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";

const UNRESTRICTED_ROLES = ["owner", "admin"];

/**
 * useDivisionScope — Scope divisi untuk halaman Event & Task.
 *
 * - owner/admin: bebas, default "all" (semua divisi).
 * - member/guest (dikunci): otomatis terbuka sesuai divisinya.
 *   Satu divisi → langsung terpilih; banyak → "mine" (gabungan divisinya);
 *   tanpa divisi → "none" (Tanpa Divisi). Server menegakkan batasan ini.
 *
 * @returns { divisions, myDivisions, isLocked, selected, setSelected,
 *            apiParam (untuk query ?divisionId=), getDivision, myDivisionIds }
 */
export function useDivisionScope(workspaceId, { role, userId } = {}) {
  const [divisions, setDivisions] = useState([]);
  const [selected, setSelected] = useState("auto");

  const isLocked = useMemo(
    () => !!role && !UNRESTRICTED_ROLES.includes(role),
    [role],
  );

  const fetchDivisions = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/divisions`);
      setDivisions(data.data.divisions || []);
    } catch (err) {
      console.error("Failed to fetch workspace divisions:", err);
    }
  }, [workspaceId]);

  useEffect(() => {
    setSelected("auto");
    fetchDivisions();
  }, [workspaceId, fetchDivisions]);

  const getMemberUserId = (m) =>
    (m.userId?._id || m.userId)?.toString?.() || String(m.userId || "");

  const myDivisions = useMemo(() => {
    if (!userId) return [];
    const uid = userId.toString();
    return divisions.filter((d) =>
      (d.members || []).some((m) => getMemberUserId(m) === uid),
    );
  }, [divisions, userId]);

  const myDivisionIds = useMemo(
    () => myDivisions.map((d) => d._id.toString()),
    [myDivisions],
  );

  // Pilihan efektif setelah "auto" di-resolve
  const effective = useMemo(() => {
    if (selected !== "auto") return selected;
    if (!isLocked) return "all";
    if (myDivisions.length === 1) return myDivisions[0]._id.toString();
    if (myDivisions.length > 1) return "mine";
    return "none";
  }, [selected, isLocked, myDivisions]);

  // Param API: undefined = ikut scope server (all utk owner/admin, mine utk locked)
  const apiParam = useMemo(() => {
    if (effective === "all" || effective === "mine") return undefined;
    if (effective === "none") return "none";
    return effective;
  }, [effective]);

  const getDivision = useCallback(
    (id) => {
      if (!id) return null;
      const sid = id.toString?.() || String(id);
      // divisionId ter-populate bisa berupa objek { _id, name, color }
      if (typeof id === "object" && id.name) return id;
      return divisions.find((d) => d._id.toString() === sid) || null;
    },
    [divisions],
  );

  return {
    divisions,
    myDivisions,
    myDivisionIds,
    isLocked,
    selected: effective,
    setSelected,
    apiParam,
    getDivision,
    refetch: fetchDivisions,
  };
}
