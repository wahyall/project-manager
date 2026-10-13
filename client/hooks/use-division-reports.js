"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export function useDivisionReports(workspaceId, divisionId) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    if (!workspaceId || !divisionId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/api/workspaces/${workspaceId}/divisions/${divisionId}/reports`
      );

      if (data?.data) {
        setReports(data.data.reports || []);
      }
    } catch (err) {
      console.error("[useDivisionReports] Fetch error:", err);
      setError(err?.response?.data?.message || err.message || "Gagal memuat laporan bulanan");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, divisionId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const createReport = useCallback(
    async (reportData) => {
      try {
        const { data } = await api.post(
          `/api/workspaces/${workspaceId}/divisions/${divisionId}/reports`,
          reportData
        );
        await fetchReports();
        return data?.data?.report;
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal membuat snapshot laporan bulanan");
      }
    },
    [workspaceId, divisionId, fetchReports]
  );

  const deleteReport = useCallback(
    async (reportId) => {
      try {
        await api.delete(
          `/api/workspaces/${workspaceId}/divisions/${divisionId}/reports/${reportId}`
        );
        await fetchReports();
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal menghapus laporan bulanan");
      }
    },
    [workspaceId, divisionId, fetchReports]
  );

  return {
    reports,
    loading,
    error,
    fetchReports,
    createReport,
    deleteReport,
  };
}
