"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";

const POLL_INTERVAL = 60000; // 60 seconds

/**
 * Hook to fetch and auto-refresh dashboard data
 *
 * @param {string} workspaceId
 * @returns {{ data, loading, error, refetch }}
 */
export function useDashboard(workspaceId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchDashboard = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const { data: res } = await api.get(
        `/workspaces/${workspaceId}/dashboard`,
      );
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchDashboard();
  }, [fetchDashboard]);

  // Polling every 60s
  useEffect(() => {
    if (!workspaceId) return;
    intervalRef.current = setInterval(fetchDashboard, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [workspaceId, fetchDashboard]);

  // Refresh on visibility change (tab focus)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchDashboard();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}
