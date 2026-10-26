"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  ExternalLink,
  RotateCw,
  Plus,
  Loader2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

export function DivisionSpreadsheetTab({
  workspaceId,
  divisionId,
  division,
  onDivisionUpdated,
  canEdit = true,
}) {
  const [googleSpreadsheetUrl, setGoogleSpreadsheetUrl] = useState(
    division?.googleSpreadsheetUrl || null
  );
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState(
    division?.googleSpreadsheetId || null
  );
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleCreateGoogleSheet = async () => {
    setCreating(true);
    try {
      const res = await api.post(
        `/workspaces/${workspaceId}/divisions/${divisionId}/google-sheet`
      );
      const { googleSpreadsheetUrl: newUrl, googleSpreadsheetId: newId } =
        res.data.data;
      setGoogleSpreadsheetUrl(newUrl);
      setGoogleSpreadsheetId(newId);
      if (onDivisionUpdated) {
        onDivisionUpdated({
          ...division,
          googleSpreadsheetUrl: newUrl,
          googleSpreadsheetId: newId,
        });
      }
      toast.success("Google Spreadsheet divisi berhasil dibuat!");
    } catch (err) {
      console.error("Gagal membuat Google Spreadsheet:", err);
      toast.error(
        err.response?.data?.message || "Gagal membuat Google Spreadsheet divisi"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      const res = await api.post(
        `/workspaces/${workspaceId}/divisions/${divisionId}/google-sheet/sync`
      );
      toast.success(
        res.data?.message || "Data divisi berhasil disinkronkan ke Google Spreadsheet!"
      );
      setIframeKey((prev) => prev + 1);
    } catch (err) {
      console.error("Gagal sinkronisasi data:", err);
      toast.error(
        err.response?.data?.message || "Gagal sinkronisasi data ke Google Spreadsheet"
      );
    } finally {
      setSyncing(false);
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
    setIframeKey((prev) => prev + 1);
  };

  const embedUrl = googleSpreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${googleSpreadsheetId}/edit`
    : googleSpreadsheetUrl;

  // Jika Google Spreadsheet belum dibuat
  if (!embedUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] p-8 border-2 border-dashed border-border rounded-xl text-center bg-card shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
          <FileSpreadsheet className="w-8 h-8" />
        </div>

        <div className="space-y-1.5 max-w-md">
          <h3 className="text-lg font-bold text-foreground">
            Google Spreadsheet Divisi Belum Dibuat
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hubungkan tracking divisi dengan Google Spreadsheet resmi. Sistem akan
            otomatis menyiapkan 3 sheet tab: <strong>Kas Bulanan</strong>,{" "}
            <strong>Infaq Anggota</strong>, dan <strong>Data Jamaah</strong>.
          </p>
        </div>

        {canEdit && (
          <Button
            onClick={handleCreateGoogleSheet}
            disabled={creating}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md px-6 py-2.5 h-auto mt-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sedang Menyiapkan Spreadsheet...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Buat Google Spreadsheet Divisi Sekarang
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Control Header ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold gap-1 text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Google Sheets Terhubung
          </Badge>
          <span className="text-xs text-muted-foreground hidden md:inline">
            Tersedia sheet: Kas Bulanan, Infaq Anggota, Data Jamaah
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              disabled={syncing}
              onClick={handleSyncData}
              className="gap-1.5 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              {syncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Sinkronkan Data ke Sheet
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshIframe}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Muat Ulang
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleOpenExternal}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Buka di Google Sheets
          </Button>
        </div>
      </div>

      {/* ── Iframe Container ────────────────────────────── */}
      <div className="relative w-full h-[650px] rounded-xl border border-border bg-background shadow-sm overflow-hidden">
        <iframe
          key={iframeKey}
          src={embedUrl}
          className="w-full h-full border-0"
          title="Google Spreadsheet Divisi"
          allow="clipboard-write"
          loading="lazy"
        />
      </div>
    </div>
  );
}
