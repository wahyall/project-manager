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

/**
 * Reusable Export Menu dropdown.
 *
 * @param {Object} props
 * @param {boolean} props.exporting - Whether an export is in progress
 * @param {Function} props.onExportCSV - Handler for CSV export (optional)
 * @param {Function} props.onExportXLSX - Handler for XLSX export (optional)
 * @param {Function} props.onExportPDF - Handler for PDF export (optional)
 * @param {string} props.pdfLabel - Custom label for PDF option (default: "Export PDF")
 * @param {string} props.variant - Button variant (default: "outline")
 * @param {string} props.size - Button size (default: "sm")
 */
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
              className="gap-1.5"
              id="export-menu-trigger"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Export data</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-48">
        {onExportCSV && (
          <DropdownMenuItem
            onClick={onExportCSV}
            disabled={exporting}
            className="gap-2 cursor-pointer"
            id="export-csv-item"
          >
            <FileText className="h-4 w-4 text-green-600" />
            Export CSV
          </DropdownMenuItem>
        )}

        {onExportXLSX && (
          <DropdownMenuItem
            onClick={onExportXLSX}
            disabled={exporting}
            className="gap-2 cursor-pointer"
            id="export-xlsx-item"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export Excel
          </DropdownMenuItem>
        )}

        {(onExportCSV || onExportXLSX) && onExportPDF && (
          <DropdownMenuSeparator />
        )}

        {onExportPDF && (
          <DropdownMenuItem
            onClick={onExportPDF}
            disabled={exporting}
            className="gap-2 cursor-pointer"
            id="export-pdf-item"
          >
            <FileText className="h-4 w-4 text-red-600" />
            {pdfLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
