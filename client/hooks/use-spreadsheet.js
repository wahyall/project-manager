"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * useSpreadsheet (workbook-based)
 *
 * Stores FortuneSheet's native workbook `data` structure in backend:
 * GET/PUT /sheets/workbook
 *
 * Ref sheet structure: https://ruilisi.github.io/fortune-sheet-docs/guide/sheet.html
 */
export function useSpreadsheet(workspaceId, eventId) {
  const [workbookData, setWorkbookData] = useState(null); // SheetType[]
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const basePath = `/workspaces/${workspaceId}/events/${eventId}/sheets`;

  const joinedWorkbookRef = useRef(false);

  const fetchWorkbook = useCallback(async () => {
    if (!workspaceId || !eventId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${basePath}/workbook`);
      const wb = data.data.workbook;
      setWorkbookData(wb.data);
      setVersion(wb.version);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load workbook");
      console.error("Failed to fetch workbook:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, eventId, basePath]);

  const saveWorkbook = useCallback(
    async (nextData) => {
      if (!workspaceId || !eventId) return;
      const { data } = await api.put(`${basePath}/workbook`, {
        data: nextData,
        version,
      });
      const wb = data.data.workbook;
      setVersion(wb.version);
      return wb;
    },
    [workspaceId, eventId, basePath, version],
  );

  // Load once
  useEffect(() => {
    fetchWorkbook();
  }, [fetchWorkbook]);

  // Socket: join workbook room + listen to updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !eventId) return;

    if (!joinedWorkbookRef.current) {
      socket.emit("workbook:join", eventId);
      joinedWorkbookRef.current = true;
    }

    const handleUpdated = ({ eventId: evt, data: wbData, version: v }) => {
      if (String(evt) !== String(eventId)) return;
      setWorkbookData(wbData);
      setVersion(v);
    };

    socket.on("workbook:updated", handleUpdated);

    return () => {
      socket.off("workbook:updated", handleUpdated);
      socket.emit("workbook:leave", eventId);
      joinedWorkbookRef.current = false;
    };
  }, [eventId]);

  // Export (still uses existing export endpoints; server now exports from workbook)
  const exportCSV = useCallback(
    async (sheetId) => {
      const response = await api.get(`${basePath}/${sheetId}/export/csv`, {
        responseType: "blob",
      });
      const sheet = Array.isArray(workbookData)
        ? workbookData.find((s) => String(s.id) === String(sheetId))
        : null;
      const fileName = `${sheet?.name || "sheet"}.csv`;
      downloadBlob(response.data, fileName, "text/csv");
    },
    [basePath, workbookData],
  );

  const exportXLSX = useCallback(async () => {
    const response = await api.get(`${basePath}/export/xlsx`, {
      responseType: "blob",
    });
    downloadBlob(
      response.data,
      "spreadsheet.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }, [basePath]);

  return {
    workbookData,
    setWorkbookData,
    version,
    loading,
    error,
    fetchWorkbook,
    saveWorkbook,
    exportCSV,
    exportXLSX,
  };
}

function downloadBlob(data, fileName, mimeType) {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
