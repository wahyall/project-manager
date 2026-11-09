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
  const [key, setKey] = useState(0);

  const getEmbedUrl = (url, id) => {
    if (id) {
      return `https://docs.google.com/spreadsheets/d/${id}/edit`;
    }
    if (url) {
      return `${url}`;
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
      <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border/80 bg-card/40 text-center space-y-4 shadow-2xs backdrop-blur-xs">
        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
          <FileSpreadsheet className="h-10 w-10" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h3 className="text-base font-bold text-foreground tracking-tight">Google Spreadsheet Event</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Event ini belum terhubung ke Google Spreadsheet. Buat lembar kerja baru untuk mengelola rekap, absensi, atau anggaran secara fleksibel dan kolaboratif.
          </p>
        </div>
        {!isReadOnly && (
          <Button
            onClick={handleCreateGoogleSheet}
            disabled={creating}
            className="h-9.5 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
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
    <div className="flex flex-col gap-0 border border-border/80 rounded-2xl overflow-hidden bg-card/60 shadow-2xs backdrop-blur-xs">
      {/* ── Header Bar ──────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/40">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-foreground tracking-tight">
            Google Spreadsheet
          </span>
          {isReadOnly && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-border/70 bg-muted/60 text-muted-foreground">
              <Eye className="h-2.5 w-2.5" />
              Read-only
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7.5 px-2.5 text-xs rounded-lg gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={handleRefreshIframe}
            title="Muat ulang spreadsheet"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7.5 px-2.5 text-xs rounded-lg gap-1.5 border-border/80 shadow-2xs"
            onClick={handleOpenExternal}
            title="Buka di Google Sheets tab baru"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Buka di Tab Baru</span>
          </Button>
        </div>
      </div>

      {/* ── Iframe Container ────────────────────────── */}
      <div className="relative w-full h-[650px] bg-background">
        <iframe
          key={key}
          src={embedUrl}
          className="w-full h-full border-0"
          title="Google Spreadsheet Embed"
          allow="autoplay; encrypted-media; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
