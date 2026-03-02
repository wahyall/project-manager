"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import "@fortune-sheet/react/dist/index.css";
import { useSpreadsheet } from "@/hooks/use-spreadsheet";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileSpreadsheet,
  FileDown,
  Loader2,
  Table2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Dynamic import FortuneSheet (client-only, no SSR)
const Workbook = dynamic(
  () => import("@fortune-sheet/react").then((mod) => mod.Workbook),
  { ssr: false, loading: () => <SpreadsheetSkeleton /> },
);

// ════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════

export function EventSpreadsheetTab({ event, workspaceId }) {
  const {
    sheetsWithData,
    fortuneSheetData,
    loading,
    error,
    sheetIdMap,
    getBackendId,
    getSheetContext,
    createSheetInBackend,
    deleteSheetInBackend,
    renameSheetInBackend,
    updateRowInBackend,
    addRowInBackend,
    deleteRowInBackend,
    addColumnInBackend,
    deleteColumnInBackend,
    fetchAllData,
    exportCSV,
    exportXLSX,
  } = useSpreadsheet(workspaceId, event._id);

  const { currentWorkspace } = useWorkspace();
  const isReadOnly = currentWorkspace?.role === "guest";

  const workbookRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  // Track the currently active sheet for export
  const [activeFortuneSheetId, setActiveFortuneSheetId] = useState(null);

  // Debounce timer for onChange saves
  const saveTimeoutRef = useRef(null);
  const lastSavedDataRef = useRef(null);

  // ── Handle onChange: debounced save of cell data ──
  const handleChange = useCallback(
    async (newData) => {
      if (isReadOnly || !newData || !sheetsWithData.length) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce: wait 500ms after last change before saving
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          // Compare newData with last saved data to find changes
          const lastSaved = lastSavedDataRef.current;
          if (!lastSaved) {
            lastSavedDataRef.current = JSON.parse(JSON.stringify(newData));
            return; // First load, don't save
          }

          // Process each sheet
          for (const fsSheet of newData) {
            const backendId = getBackendId(String(fsSheet.id));
            const ctx = getSheetContext(String(fsSheet.id));
            if (!ctx) continue;

            const columns = [...(ctx.sheet.columns || [])].sort(
              (a, b) => a.order - b.order,
            );

            // Extract cell data from FortuneSheet format
            const celldata = fsSheet.celldata || [];
            const cellMap = new Map();
            celldata.forEach((cell) => {
              if (cell.r === 0) return; // Skip header row
              const key = `${cell.r}_${cell.c}`;
              cellMap.set(key, cell);
            });

            // Compare with last saved state
            const lastSheet = lastSaved.find((s) => s.id === fsSheet.id);
            if (!lastSheet) continue;

            const lastCellMap = new Map();
            (lastSheet.celldata || []).forEach((cell) => {
              if (cell.r === 0) return;
              const key = `${cell.r}_${cell.c}`;
              lastCellMap.set(key, cell);
            });

            // Find changed cells
            const changedCells = [];
            cellMap.forEach((cell, key) => {
              const lastCell = lastCellMap.get(key);
              const newValue =
                cell.v?.v !== undefined ? cell.v.v : cell.v?.m || "";
              const oldValue =
                lastCell?.v?.v !== undefined
                  ? lastCell.v.v
                  : lastCell?.v?.m || "";

              if (newValue !== oldValue) {
                changedCells.push({ cell, key });
              }
            });

            // Also check for deleted cells
            lastCellMap.forEach((lastCell, key) => {
              if (!cellMap.has(key)) {
                changedCells.push({ cell: null, key, deleted: true });
              }
            });

            // Batch update changed cells
            if (changedCells.length > 0) {
              const rowUpdates = new Map(); // rowIndex → { rowId, cells: {} }

              for (const { cell, key, deleted } of changedCells) {
                const [rowIdx, colIdx] = key.split("_").map(Number);
                const dataRowIndex = rowIdx - 1; // offset for header
                const row = ctx.rows[dataRowIndex];
                const column = columns[colIdx];

                if (!row || !column) continue;

                if (!rowUpdates.has(dataRowIndex)) {
                  rowUpdates.set(dataRowIndex, {
                    rowId: row._id,
                    cells: {},
                  });
                }

                const update = rowUpdates.get(dataRowIndex);
                if (deleted) {
                  update.cells[column._id] = null; // Delete cell
                } else {
                  const value =
                    cell.v?.v !== undefined ? cell.v.v : cell.v?.m || "";
                  update.cells[column._id] = value;
                }
              }

              // Save all row updates
              for (const update of rowUpdates.values()) {
                await updateRowInBackend(backendId, update.rowId, {
                  cells: update.cells,
                });
              }
            }
          }

          // Update last saved reference
          lastSavedDataRef.current = JSON.parse(JSON.stringify(newData));
        } catch (err) {
          console.error("Failed to save changes:", err);
          toast.error("Failed to save changes");
        }
      }, 500); // 500ms debounce
    },
    [
      isReadOnly,
      sheetsWithData,
      getBackendId,
      getSheetContext,
      updateRowInBackend,
    ],
  );

  // Initialize lastSavedDataRef when data loads
  useEffect(() => {
    if (fortuneSheetData && !lastSavedDataRef.current) {
      lastSavedDataRef.current = JSON.parse(
        JSON.stringify(fortuneSheetData),
      );
    }
  }, [fortuneSheetData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ── Handle operations from FortuneSheet → sync structural changes immediately ──
  const handleOp = useCallback(
    async (ops) => {
      if (isReadOnly) return;

      for (const op of ops) {
        try {
          switch (op.op) {
            // ── Row/Column insert ──
            case "insertRowCol": {
              const sheetId = op.id || activeFortuneSheetId;
              const backendId = getBackendId(sheetId);
              const ctx = getSheetContext(sheetId);

              if (!ctx) continue;

              if (op.value?.type === "row") {
                await addRowInBackend(backendId);
              } else if (op.value?.type === "column") {
                const columns = ctx.sheet.columns || [];
                await addColumnInBackend(backendId, {
                  name: `Column ${columns.length + 1}`,
                  type: "text",
                });
              }
              break;
            }

            // ── Row/Column delete ──
            case "deleteRowCol": {
              const sheetId = op.id || activeFortuneSheetId;
              const backendId = getBackendId(sheetId);
              const ctx = getSheetContext(sheetId);

              if (!ctx) continue;

              if (op.value?.type === "row" && op.value?.start != null) {
                const rowIdx = op.value.start - 1; // offset for header
                const row = ctx.rows[rowIdx];
                if (row) {
                  await deleteRowInBackend(backendId, row._id);
                }
              } else if (
                op.value?.type === "column" &&
                op.value?.start != null
              ) {
                const columns = [...(ctx.sheet.columns || [])].sort(
                  (a, b) => a.order - b.order,
                );
                const col = columns[op.value.start];
                if (col) {
                  await deleteColumnInBackend(backendId, col._id);
                }
              }
              break;
            }

            // ── Sheet added via FortuneSheet "+" button ──
            case "addSheet": {
              const fsSheet = op.value;
              if (fsSheet) {
                const backendSheet = await createSheetInBackend(
                  fsSheet.name || "New Sheet",
                );
                // Map FortuneSheet's generated ID → our backend ID
                sheetIdMap.current.set(
                  String(fsSheet.id),
                  backendSheet._id,
                );
              }
              break;
            }

            // ── Sheet deleted via FortuneSheet tab context menu ──
            case "deleteSheet": {
              const fsId = op.id;
              if (fsId) {
                const backendId = getBackendId(String(fsId));
                await deleteSheetInBackend(backendId);
                sheetIdMap.current.delete(String(fsId));
              }
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.error("Failed to sync op to backend:", err);
        }
      }
    },
    [
      isReadOnly,
      activeFortuneSheetId,
      getBackendId,
      getSheetContext,
      sheetIdMap,
      addRowInBackend,
      deleteRowInBackend,
      addColumnInBackend,
      deleteColumnInBackend,
      createSheetInBackend,
      deleteSheetInBackend,
    ],
  );

  // ── FortuneSheet hooks — handle sheet lifecycle events ──
  const fortuneHooks = useMemo(
    () => ({
      // Protect header row from edits
      beforeUpdateCell: (r, c, value) => {
        if (r === 0) return false;
        return true;
      },

      // Track active sheet for export
      afterActivateSheet: (id) => {
        setActiveFortuneSheetId(String(id));
      },

      // Sync sheet rename to backend
      afterUpdateSheetName: (id, oldName, newName) => {
        const backendId = getBackendId(String(id));
        renameSheetInBackend(backendId, newName).catch((err) => {
          console.error("Failed to rename sheet:", err);
          toast.error("Failed to rename sheet");
        });
      },
    }),
    [getBackendId, renameSheetInBackend],
  );

  // ── Export ──
  const handleExportCSV = async () => {
    // Find the active sheet's backend ID
    const backendId = activeFortuneSheetId
      ? getBackendId(activeFortuneSheetId)
      : sheetsWithData[0]?.sheet?._id;

    if (!backendId) return;

    setExporting(true);
    try {
      await exportCSV(backendId);
      toast.success("CSV exported");
    } catch (err) {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const handleExportXLSX = async () => {
    setExporting(true);
    try {
      await exportXLSX();
      toast.success("Excel exported");
    } catch (err) {
      toast.error("Failed to export Excel");
    } finally {
      setExporting(false);
    }
  };

  // ════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════

  if (loading) return <SpreadsheetSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive/60 mb-3" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => fetchAllData()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 border rounded-lg overflow-hidden bg-background">
      {/* ── Header bar ──────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Spreadsheet
          </span>
          {isReadOnly && (
            <Badge
              variant="secondary"
              className="text-[10px] h-5 gap-1 font-normal"
            >
              <Eye className="h-3 w-3" />
              Read-only
            </Badge>
          )}
        </div>

        {/* Export menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV (active sheet)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportXLSX}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel (all sheets)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── FortuneSheet ─────────────────────────────── */}
      <div className="relative" style={{ height: "650px", width: "100%" }}>
        {fortuneSheetData ? (
          <Workbook
            ref={workbookRef}
            data={fortuneSheetData}
            onChange={handleChange}
            onOp={handleOp}
            showToolbar={!isReadOnly}
            showFormulaBar={!isReadOnly}
            showSheetTabs={true}
            allowEdit={!isReadOnly}
            lang="en"
            hooks={fortuneHooks}
            toolbarItems={[
              "undo",
              "redo",
              "format-painter",
              "clear-format",
              "|",
              "currency-format",
              "percentage-format",
              "number-decrease",
              "number-increase",
              "format",
              "|",
              "font",
              "|",
              "font-size",
              "|",
              "bold",
              "italic",
              "strike-through",
              "underline",
              "|",
              "font-color",
              "background",
              "border",
              "merge-cell",
              "|",
              "horizontal-align",
              "vertical-align",
              "text-wrap",
              "text-rotation",
              "|",
              "freeze",
              "conditionFormat",
              "filter",
              "link",
              "image",
              "comment",
              "quick-formula",
            ]}
            cellContextMenu={
              isReadOnly
                ? ["copy"]
                : [
                    "copy",
                    "paste",
                    "|",
                    "insert-row",
                    "insert-column",
                    "delete-row",
                    "delete-column",
                    "delete-cell",
                    "hide-row",
                    "hide-column",
                    "set-row-height",
                    "set-column-width",
                    "|",
                    "clear",
                    "sort",
                    "orderAZ",
                    "orderZA",
                    "filter",
                    "image",
                    "link",
                    "cell-format",
                  ]
            }
            headerContextMenu={
              isReadOnly
                ? ["copy"]
                : [
                    "copy",
                    "paste",
                    "|",
                    "insert-row",
                    "insert-column",
                    "delete-row",
                    "delete-column",
                    "delete-cell",
                    "hide-row",
                    "hide-column",
                    "set-row-height",
                    "set-column-width",
                    "|",
                    "clear",
                    "sort",
                    "orderAZ",
                    "orderZA",
                  ]
            }
            sheetTabContextMenu={
              isReadOnly
                ? []
                : ["delete", "copy", "rename", "color", "hide", "|", "move"]
            }
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No sheet data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Loading Skeleton
// ════════════════════════════════════════════════

function SpreadsheetSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-16" />
      </div>
      <div className="p-0">
        <Skeleton className="h-[650px] w-full rounded-none" />
      </div>
    </div>
  );
}
