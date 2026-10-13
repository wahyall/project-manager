"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export function useDivisionInfaq(workspaceId, divisionId) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalMembers: 0,
    paidMembers: 0,
    unpaidMembers: 0,
    totalAmountCollected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());

  const fetchInfaq = useCallback(async () => {
    if (!workspaceId || !divisionId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/api/workspaces/${workspaceId}/divisions/${divisionId}/infaq`,
        { params: { month, year } }
      );

      if (data?.data) {
        setRecords(data.data.records || []);
        setSummary(
          data.data.summary || {
            totalMembers: 0,
            paidMembers: 0,
            unpaidMembers: 0,
            totalAmountCollected: 0,
          }
        );
      }
    } catch (err) {
      console.error("[useDivisionInfaq] Fetch error:", err);
      setError(err?.response?.data?.message || err.message || "Gagal memuat infaq anggota");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, divisionId, month, year]);

  useEffect(() => {
    fetchInfaq();
  }, [fetchInfaq]);

  const recordInfaq = useCallback(
    async (infaqData) => {
      try {
        const payload = {
          month,
          year,
          ...infaqData,
        };
        const { data } = await api.post(
          `/api/workspaces/${workspaceId}/divisions/${divisionId}/infaq`,
          payload
        );
        await fetchInfaq();
        return data?.data?.record;
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal mencatat status infaq");
      }
    },
    [workspaceId, divisionId, month, year, fetchInfaq]
  );

  const togglePaid = useCallback(
    async (memberUserId, currentPaid, defaultAmount = 20000) => {
      const nextPaid = !currentPaid;
      return recordInfaq({
        memberUserId,
        isPaid: nextPaid,
        amount: nextPaid ? defaultAmount : 0,
        paymentDate: nextPaid ? new Date().toISOString() : null,
      });
    },
    [recordInfaq]
  );

  return {
    records,
    summary,
    loading,
    error,
    month,
    setMonth,
    year,
    setYear,
    fetchInfaq,
    recordInfaq,
    togglePaid,
  };
}
