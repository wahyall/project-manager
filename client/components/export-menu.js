"use client";

import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ExportMenu({
  exporting = false,
  onExportCSV,
  onExportXLSX,
  onExportPDF,
  pdfLabel = "Export PDF",
  variant = "outline",
  size = "sm",
}) {
  const hasAny = onExportCSV || onExportXLSX || onExportPDF;
  if (!hasAny) return null;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              size={size}
              disabled={exporting}
              className="gap-1.5 rounded-xl border-border/80 bg-background/80 shadow-2xs text-xs font-medium"
              id="export-menu-trigger"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent className="rounded-xl border-border/80 text-xs">Export data</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-48 rounded-2xl border-border/80 shadow-xl p-1">
        {onExportCSV && (
          <DropdownMenuItem
            onClick={onExportCSV}
            disabled={exporting}
            className="gap-2.5 rounded-xl text-xs cursor-pointer py-2"
            id="export-csv-item"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span>Export CSV</span>
          </DropdownMenuItem>
        )}

        {onExportXLSX && (
          <DropdownMenuItem
            onClick={onExportXLSX}
            disabled={exporting}
            className="gap-2.5 rounded-xl text-xs cursor-pointer py-2"
            id="export-xlsx-item"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="h-3.5 w-3.5" />
            </div>
            <span>Export Excel</span>
          </DropdownMenuItem>
        )}

        {(onExportCSV || onExportXLSX) && onExportPDF && (
          <DropdownMenuSeparator className="my-1" />
        )}

        {onExportPDF && (
          <DropdownMenuItem
            onClick={onExportPDF}
            disabled={exporting}
            className="gap-2.5 rounded-xl text-xs cursor-pointer py-2"
            id="export-pdf-item"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span>{pdfLabel}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
