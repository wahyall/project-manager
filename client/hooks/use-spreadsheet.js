"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * useSpreadsheet — Core hook for Spreadsheet management
 *
 * Loads ALL sheets with data in one request, converts to FortuneSheet format,
 * and provides backend sync functions + Socket.io real-time listeners.
 */
export function useSpreadsheet(workspaceId, eventId) {
  const [sheetsWithData, setSheetsWithData] = useState([]); // [{sheet, rows, groups}, ...]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map FortuneSheet-generated IDs → backend MongoDB IDs
  // For initially loaded sheets: fsId === backendId
  // For new sheets created via FortuneSheet UI: fsId → backendId
  const sheetIdMap = useRef(new Map());

  const basePath = `/workspaces/${workspaceId}/events/${eventId}/sheets`;

  // Track joined sheet rooms for cleanup
  const joinedSheetsRef = useRef([]);

  // ══════════════════════════════════════════════
  // Data loading
  // ══════════════════════════════════════════════

  const fetchAllData = useCallback(async () => {
    if (!workspaceId || !eventId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${basePath}/all-data`);
      const sheets = data.data.sheets;
      setSheetsWithData(sheets);

      // Initialize ID mapping (fsId = backendId for loaded sheets)
      sheetIdMap.current.clear();
      sheets.forEach(({ sheet }) => {
        sheetIdMap.current.set(sheet._id, sheet._id);
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load spreadsheet data",
      );
      console.error("Failed to fetch all sheets data:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, eventId, basePath]);

  // ══════════════════════════════════════════════
  // FortuneSheet data conversion
  // ══════════════════════════════════════════════

  const fortuneSheetData = useMemo(() => {
    if (!sheetsWithData || sheetsWithData.length === 0) return null;

    return sheetsWithData.map(({ sheet, rows }, idx) => {
      const columns = [...(sheet.columns || [])].sort(
        (a, b) => a.order - b.order,
      );
      const celldata = [];

      // Header row (row 0) — column names with bold + bg
      columns.forEach((col, colIdx) => {
        celldata.push({
          r: 0,
          c: colIdx,
          v: {
            v: col.name,
            m: col.name,
            ct: { fa: "General", t: "g" },
            bl: 1,
            fc: "#1e293b",
            bg: "#f1f5f9",
          },
        });
      });

      // Data rows (offset by 1 for header)
      rows.forEach((row, rowIdx) => {
        columns.forEach((col, colIdx) => {
          const cellValue = row.cells?.[col._id] ?? "";
          if (
            cellValue !== "" &&
            cellValue !== null &&
            cellValue !== undefined
          ) {
            celldata.push({
              r: rowIdx + 1,
              c: colIdx,
              v: formatCellForFortuneSheet(cellValue, col.type),
            });
          }
        });
      });

      return {
        name: sheet.name,
        id: sheet._id,
        order: sheet.order ?? idx,
        status: idx === 0 ? 1 : 0, // First sheet is active
        celldata,
        row: Math.max(rows.length + 30, 50),
        column: Math.max(columns.length + 5, 26),
        config: {
          columnlen: columns.reduce((acc, col, i) => {
            acc[i] = col.width || 150;
            return acc;
          }, {}),
        },
      };
    });
  }, [sheetsWithData]);

  // ══════════════════════════════════════════════
  // Backend sync helpers
  // ══════════════════════════════════════════════

  /** Resolve a FortuneSheet sheet ID to the real backend ID */
  const getBackendId = useCallback((fsId) => {
    return sheetIdMap.current.get(fsId) || fsId;
  }, []);

  /** Find the sheet + rows data for a given FortuneSheet sheet ID */
  const getSheetContext = useCallback(
    (fsSheetId) => {
      const backendId = getBackendId(fsSheetId);
      return sheetsWithData.find(({ sheet }) => sheet._id === backendId);
    },
    [sheetsWithData, getBackendId],
  );

  // ── Sheet ops ──

  const createSheetInBackend = useCallback(
    async (name) => {
      const { data } = await api.post(basePath, { name });
      return data.data.sheet;
    },
    [basePath],
  );

  const deleteSheetInBackend = useCallback(
    async (sheetId) => {
      await api.delete(`${basePath}/${sheetId}`);
    },
    [basePath],
  );

  const renameSheetInBackend = useCallback(
    async (sheetId, name) => {
      await api.put(`${basePath}/${sheetId}`, { name });
    },
    [basePath],
  );

  const duplicateSheetInBackend = useCallback(
    async (sheetId) => {
      const { data } = await api.post(`${basePath}/${sheetId}/duplicate`);
      return data.data.sheet;
    },
    [basePath],
  );

  // ── Row ops ──

  const updateRowInBackend = useCallback(
    async (sheetId, rowId, updates) => {
      const { data } = await api.put(
        `${basePath}/${sheetId}/rows/${rowId}`,
        updates,
      );
      return data.data.row;
    },
    [basePath],
  );

  const addRowInBackend = useCallback(
    async (sheetId, rowData = {}) => {
      const { data } = await api.post(
        `${basePath}/${sheetId}/rows`,
        rowData,
      );
      return data.data.row;
    },
    [basePath],
  );

  const deleteRowInBackend = useCallback(
    async (sheetId, rowId) => {
      await api.delete(`${basePath}/${sheetId}/rows/${rowId}`);
    },
    [basePath],
  );

  // ── Column ops ──

  const addColumnInBackend = useCallback(
    async (sheetId, columnData) => {
      const { data } = await api.post(
        `${basePath}/${sheetId}/columns`,
        columnData,
      );
      return data.data.column;
    },
    [basePath],
  );

  const deleteColumnInBackend = useCallback(
    async (sheetId, colId) => {
      await api.delete(`${basePath}/${sheetId}/columns/${colId}`);
    },
    [basePath],
  );

  // ── Export ──

  const exportCSV = useCallback(
    async (sheetId) => {
      const response = await api.get(`${basePath}/${sheetId}/export/csv`, {
        responseType: "blob",
      });
      const sheetInfo = sheetsWithData.find(
        ({ sheet }) => sheet._id === sheetId,
      );
      const fileName = `${sheetInfo?.sheet?.name || "sheet"}.csv`;
      downloadBlob(response.data, fileName, "text/csv");
    },
    [basePath, sheetsWithData],
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

  // ══════════════════════════════════════════════
  // Socket.io real-time sync
  // ══════════════════════════════════════════════

  useEffect(() => {
    const socket = getSocket();
    if (!socket || sheetsWithData.length === 0) return;

    // Join all sheet rooms
    const sheetIds = sheetsWithData.map(({ sheet }) => sheet._id);

    // Leave old rooms, join new ones
    joinedSheetsRef.current.forEach((id) => {
      if (!sheetIds.includes(id)) {
        socket.emit("sheet:leave", id);
      }
    });
    sheetIds.forEach((id) => {
      if (!joinedSheetsRef.current.includes(id)) {
        socket.emit("sheet:join", id);
      }
    });
    joinedSheetsRef.current = sheetIds;

    // Cell updated by another user
    const handleCellUpdated = ({ sheetId, rowId, columnId, value }) => {
      setSheetsWithData((prev) =>
        prev.map((item) => {
          if (item.sheet._id !== sheetId) return item;
          return {
            ...item,
            rows: item.rows.map((row) => {
              if (row._id !== rowId) return row;
              return { ...row, cells: { ...row.cells, [columnId]: value } };
            }),
          };
        }),
      );
    };

    // Row added by another user
    const handleRowAdded = ({ sheetId, row }) => {
      setSheetsWithData((prev) =>
        prev.map((item) => {
          if (item.sheet._id !== sheetId) return item;
          return {
            ...item,
            rows: [...item.rows, row].sort((a, b) => a.order - b.order),
          };
        }),
      );
    };

    // Row deleted by another user
    const handleRowDeleted = ({ sheetId, rowId }) => {
      setSheetsWithData((prev) =>
        prev.map((item) => {
          if (item.sheet._id !== sheetId) return item;
          return {
            ...item,
            rows: item.rows.filter((r) => r._id !== rowId),
          };
        }),
      );
    };

    // Sheet created/deleted by another user → reload all
    const handleSheetCreated = () => fetchAllData();
    const handleSheetDeleted = () => fetchAllData();

    socket.on("sheet:cell:updated", handleCellUpdated);
    socket.on("sheet:row:added", handleRowAdded);
    socket.on("sheet:row:deleted", handleRowDeleted);
    socket.on("sheet:created", handleSheetCreated);
    socket.on("sheet:deleted", handleSheetDeleted);

    return () => {
      socket.off("sheet:cell:updated", handleCellUpdated);
      socket.off("sheet:row:added", handleRowAdded);
      socket.off("sheet:row:deleted", handleRowDeleted);
      socket.off("sheet:created", handleSheetCreated);
      socket.off("sheet:deleted", handleSheetDeleted);
    };
  }, [sheetsWithData, fetchAllData]);

  // Cleanup: leave all rooms on unmount
  useEffect(() => {
    return () => {
      const socket = getSocket();
      if (socket) {
        joinedSheetsRef.current.forEach((id) =>
          socket.emit("sheet:leave", id),
        );
        joinedSheetsRef.current = [];
      }
    };
  }, []);

  // Load on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    // Data
    sheetsWithData,
    fortuneSheetData,
    loading,
    error,

    // ID mapping
    sheetIdMap,
    getBackendId,
    getSheetContext,

    // Backend sync
    createSheetInBackend,
    deleteSheetInBackend,
    renameSheetInBackend,
    duplicateSheetInBackend,
    updateRowInBackend,
    addRowInBackend,
    deleteRowInBackend,
    addColumnInBackend,
    deleteColumnInBackend,

    // Reload
    fetchAllData,

    // Export
    exportCSV,
    exportXLSX,
  };
}

// ══════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════

function formatCellForFortuneSheet(value, columnType) {
  const cell = { v: value, m: String(value) };

  switch (columnType) {
    case "number":
      cell.v = typeof value === "number" ? value : parseFloat(value) || 0;
      cell.m = String(cell.v);
      cell.ct = { fa: "General", t: "n" };
      break;
    case "date":
      cell.m = value ? String(value) : "";
      cell.ct = { fa: "yyyy-MM-dd", t: "d" };
      break;
    case "checkbox":
      cell.v = value ? "✓" : "✗";
      cell.m = cell.v;
      break;
    case "url":
      cell.v = String(value);
      cell.m = String(value);
      cell.hl = { linkType: "external", linkAddress: String(value) };
      break;
    default:
      cell.v = String(value);
      cell.m = String(value);
      break;
  }

  return cell;
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
