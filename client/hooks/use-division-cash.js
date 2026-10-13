"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export function useDivisionCash(workspaceId, divisionId) {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalBalance: 0,
    monthIncome: 0,
    monthExpense: 0,
    monthBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [search, setSearch] = useState("");

  const fetchCash = useCallback(async () => {
    if (!workspaceId || !divisionId) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (month) params.month = month;
      if (year) params.year = year;
      if (search && search.trim()) params.search = search.trim();

      const { data } = await api.get(
        `/api/workspaces/${workspaceId}/divisions/${divisionId}/cash`,
        { params }
      );

      if (data?.data) {
        setTransactions(data.data.transactions || []);
        setSummary(
          data.data.summary || {
            totalBalance: 0,
            monthIncome: 0,
            monthExpense: 0,
            monthBalance: 0,
          }
        );
      }
    } catch (err) {
      console.error("[useDivisionCash] Fetch error:", err);
      setError(err?.response?.data?.message || err.message || "Gagal memuat kas divisi");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, divisionId, month, year, search]);

  useEffect(() => {
    fetchCash();
  }, [fetchCash]);

  const createTransaction = useCallback(
    async (txData) => {
      try {
        const { data } = await api.post(
          `/api/workspaces/${workspaceId}/divisions/${divisionId}/cash`,
          txData
        );
        await fetchCash();
        return data?.data?.transaction;
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal mencatat transaksi kas");
      }
    },
    [workspaceId, divisionId, fetchCash]
  );

  const updateTransaction = useCallback(
    async (transactionId, txData) => {
      try {
        const { data } = await api.put(
          `/api/workspaces/${workspaceId}/divisions/${divisionId}/cash/${transactionId}`,
          txData
        );
        await fetchCash();
        return data?.data?.transaction;
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal memperbarui transaksi kas");
      }
    },
    [workspaceId, divisionId, fetchCash]
  );

  const deleteTransaction = useCallback(
    async (transactionId) => {
      try {
        await api.delete(
          `/api/workspaces/${workspaceId}/divisions/${divisionId}/cash/${transactionId}`
        );
        await fetchCash();
      } catch (err) {
        throw new Error(err?.response?.data?.message || "Gagal menghapus transaksi kas");
      }
    },
    [workspaceId, divisionId, fetchCash]
  );

  return {
    transactions,
    summary,
    loading,
    error,
    month,
    setMonth,
    year,
    setYear,
    search,
    setSearch,
    fetchCash,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
