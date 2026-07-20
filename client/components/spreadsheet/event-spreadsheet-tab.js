"use client";

import { useState } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table2,
  ExternalLink,
  RotateCw,
  Plus,
  Loader2,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export function EventSpreadsheetTab({ event, workspaceId }) {
  const { currentWorkspace } = useWorkspace();
  const isReadOnly = currentWorkspace?.role === "guest";

  const [googleSpreadsheetUrl, setGoogleSpreadsheetUrl] = useState(
    event?.googleSpreadsheetUrl || null
  );
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState(
    event?.googleSpreadsheetId || null
  );
  const [creating, setCreating] = useState(false);
  const [key, setKey] = useState(0); // For forcing iframe reload

  // Helper to build iframe src URL with minimal UI
  const getEmbedUrl = (url, id) => {
    if (id) {
      return `https://docs.google.com/spreadsheets/d/${id}/edit?rm=minimal`;
    }
    if (url) {
      if (url.includes("?")) {
        return `${url}&rm=minimal`;
      }
      return `${url}?rm=minimal`;
    }
    return "";
  };

  const handleCreateGoogleSheet = async () => {
    setCreating(true);
    try {
      const res = await api.post(
        `/workspaces/${workspaceId}/events/${event._id}/google-sheet`
      );
      const { googleSpreadsheetUrl: newUrl, googleSpreadsheetId: newId } =
        res.data.data;
      setGoogleSpreadsheetUrl(newUrl);
      setGoogleSpreadsheetId(newId);
      toast.success("Google Spreadsheet berhasil dibuat!");
    } catch (err) {
      console.error("Failed to create Google Spreadsheet:", err);
      toast.error(
        err.response?.data?.message || "Gagal membuat Google Spreadsheet"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleOpenExternal = () => {
    const rawUrl =
      googleSpreadsheetUrl ||
      (googleSpreadsheetId
        ? `https://docs.google.com/spreadsheets/d/${googleSpreadsheetId}/edit`
        : null);
    if (rawUrl) {
      window.open(rawUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleRefreshIframe = () => {
    setKey((prev) => prev + 1);
  };

  const embedUrl = getEmbedUrl(googleSpreadsheetUrl, googleSpreadsheetId);

  // If event does not have Google Spreadsheet yet
  if (!embedUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-background text-center space-y-4">
        <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <FileSpreadsheet className="h-10 w-10" />
        </div>
        <div className="max-w-md space-y-1">
          <h3 className="text-lg font-semibold">Google Spreadsheet Event</h3>
          <p className="text-sm text-muted-foreground">
            Event ini belum memiliki Google Spreadsheet. Buat spreadsheet baru
            untuk mengelola data event ini secara fleksibel.
          </p>
        </div>
        {!isReadOnly && (
          <Button
            onClick={handleCreateGoogleSheet}
            disabled={creating}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {creating ? "Membuat Spreadsheet..." : "Buat Google Spreadsheet"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 border rounded-lg overflow-hidden bg-background">
      {/* ── Header Bar ──────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-foreground">
            Google Spreadsheet
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

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleRefreshIframe}
            title="Muat ulang spreadsheet"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            onClick={handleOpenExternal}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Buka di Google Sheets</span>
          </Button>
        </div>
      </div>

      {/* ── Google Spreadsheet iframe ───────────────── */}
      <div className="relative w-full h-[680px] bg-background">
        <iframe
          key={key}
          src={embedUrl}
          className="w-full h-full border-0"
          allow="clipboard-write; auto-fill; fullscreen"
          title={`Google Spreadsheet - ${event?.title || "Event"}`}
        />
      </div>
    </div>
  );
}
