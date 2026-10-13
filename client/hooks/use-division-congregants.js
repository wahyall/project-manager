"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export function useDivisionCongregants(workspaceId, divisionId) {
  const [congregants, setCongregants] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const fetchCongregants = useCallback(async () => {
    if (!workspaceId || !divisionId) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search && search.trim()) params.search = search.trim();
      if (category && category !== "all") params.category = category;

      const { data } = await api.get(
        `/api/workspaces/${workspaceId}/divisions/${divisionId}/congregants`,
        { params }
      );

      if (data?.data) {
        setCongregants(data.data.congregants || []);
        setTotalCount(data.data.totalCount || 0);
      }
    } catch (err) {
      console.error("[useDivisionCongregants] Fetch error:", err);
      setError(err?.response?.data?.message || err.message || "Gagal memuat data jamaah");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, divisionId, search, category]);

  useEffect(() => {
    fetchCongregants();
  }, [fetchCongregants]);

  const createCongregant = useCallback(
    async (congregantData) => {
      try {
        const { data } = await api.post(
          `/api/workspaces/${workspaceId}/divisions/${divisionId}/congregants`,
          congregantData
        );
        await fetchCongregants();
        return data?.data?.congregant;
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal menambah data jamaah");
      }
    },
    [workspaceId, divisionId, fetchCongregants]
  );

  const updateCongregant = useCallback(
    async (congregantId, congregantData) => {
      try {
        const { data } = await api.put(
          `/api/workspaces/${workspaceId}/divisions/${divisionId}/congregants/${congregantId}`,
          congregantData
        );
        await fetchCongregants();
        return data?.data?.congregant;
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal memperbarui data jamaah");
      }
    },
    [workspaceId, divisionId, fetchCongregants]
  );

  const deleteCongregant = useCallback(
    async (congregantId) => {
      try {
        await api.delete(
          `/api/workspaces/${workspaceId}/divisions/${divisionId}/congregants/${congregantId}`
        );
        await fetchCongregants();
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal menghapus data jamaah");
      }
    },
    [workspaceId, divisionId, fetchCongregants]
  );

  return {
    congregants,
    totalCount,
    loading,
    error,
    search,
    setSearch,
    category,
    setCategory,
    fetchCongregants,
    createCongregant,
    updateCongregant,
    deleteCongregant,
  };
}
