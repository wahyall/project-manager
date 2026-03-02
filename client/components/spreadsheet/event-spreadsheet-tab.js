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
    workbookData,
    setWorkbookData,
    version,
    loading,
    error,
    fetchWorkbook,
    saveWorkbook,
    exportCSV,
    exportXLSX,
  } = useSpreadsheet(workspaceId, event._id);

  const { currentWorkspace } = useWorkspace();
  const isReadOnly = currentWorkspace?.role === "guest";

  const workbookRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  // Track the currently active sheet for export
  const [activeFortuneSheetId, setActiveFortuneSheetId] = useState(null);

  // Debounce timer for saving full workbook (native FortuneSheet structure)
  const saveTimeoutRef = useRef(null);
  const lastSavedDataRef = useRef(null);

  // ── Handle onChange: keep workbook controlled + debounced PUT ──
  const handleChange = useCallback(
    async (newData) => {
      if (isReadOnly || !Array.isArray(newData)) return;

      // Control the Workbook so it never snaps back on rerender
      setWorkbookData(newData);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          // Avoid saving if nothing actually changed since last save
          const serialized = JSON.stringify(newData);
          if (lastSavedDataRef.current === serialized) {
            return;
          }

          await saveWorkbook(newData);
          lastSavedDataRef.current = serialized;
        } catch (err) {
          console.error("Failed to save workbook:", err);
          toast.error("Failed to save changes");
        }
      }, 200);
    },
    [isReadOnly, setWorkbookData, saveWorkbook],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ── FortuneSheet hooks — handle sheet lifecycle events ──
  const fortuneHooks = useMemo(
    () => ({
      // Track active sheet for export
      afterActivateSheet: (id) => {
        setActiveFortuneSheetId(String(id));
      },
    }),
    [],
  );

  // ── Export ──
  const handleExportCSV = async () => {
    // Find the active sheet's backend ID
    const backendId = activeFortuneSheetId || workbookData?.[0]?.id;

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
          onClick={() => fetchWorkbook()}
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
        {workbookData ? (
          <Workbook
            ref={workbookRef}
            data={workbookData}
            onChange={handleChange}
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
