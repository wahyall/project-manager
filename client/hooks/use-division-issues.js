"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export function useDivisionIssues(workspaceId, divisionId) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchIssues = useCallback(async () => {
    if (!workspaceId || !divisionId) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (typeFilter && typeFilter !== "all") params.type = typeFilter;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;

      const { data } = await api.get(
        `/workspaces/${workspaceId}/divisions/${divisionId}/issues`,
        { params }
      );

      if (data?.data) {
        setIssues(data.data.issues || []);
      }
    } catch (err) {
      console.error("[useDivisionIssues] Fetch error:", err);
      setError(err?.response?.data?.message || err.message || "Gagal memuat kendala divisi");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, divisionId, typeFilter, statusFilter]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const createIssue = useCallback(
    async (issueData) => {
      try {
        const { data } = await api.post(
          `/workspaces/${workspaceId}/divisions/${divisionId}/issues`,
          issueData
        );
        await fetchIssues();
        return data?.data?.issue;
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal mencatat kendala divisi");
      }
    },
    [workspaceId, divisionId, fetchIssues]
  );

  const updateIssue = useCallback(
    async (issueId, issueData) => {
      try {
        const { data } = await api.put(
          `/workspaces/${workspaceId}/divisions/${divisionId}/issues/${issueId}`,
          issueData
        );
        await fetchIssues();
        return data?.data?.issue;
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal memperbarui kendala divisi");
      }
    },
    [workspaceId, divisionId, fetchIssues]
  );

  const deleteIssue = useCallback(
    async (issueId) => {
      try {
        await api.delete(
          `/workspaces/${workspaceId}/divisions/${divisionId}/issues/${issueId}`
        );
        await fetchIssues();
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal menghapus kendala divisi");
      }
    },
    [workspaceId, divisionId, fetchIssues]
  );

  return {
    issues,
    loading,
    error,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    fetchIssues,
    createIssue,
    updateIssue,
    deleteIssue,
  };
}
