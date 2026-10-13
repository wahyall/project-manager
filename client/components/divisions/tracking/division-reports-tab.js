"use client";

import { useState } from "react";
import {
  FileText,
  Lock,
  Plus,
  Loader2,
  Calendar,
  Wallet,
  HeartHandshake,
  Users,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDivisionReports } from "@/hooks/use-division-reports";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function DivisionReportsTab({ workspaceId, divisionId, canEdit = true }) {
  const { reports, loading, error, createReport, deleteReport } = useDivisionReports(
    workspaceId,
    divisionId
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    title: "",
    notes: "",
  });

  const formatRupiah = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleOpenAdd = () => {
    const curMonth = new Date().getMonth() + 1;
    const curYear = new Date().getFullYear();
    setFormData({
      month: curMonth,
      year: curYear,
      title: `Laporan Bulanan ${MONTH_NAMES[curMonth - 1]} ${curYear}`,
      notes: "",
    });
    setErrorMessage("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");
    try {
      await createReport({
        month: Number(formData.month),
        year: Number(formData.year),
        title: formData.title.trim(),
        notes: formData.notes.trim(),
      });
      setDialogOpen(false);
    } catch (err) {
      setErrorMessage(err.message || "Gagal membuat snapshot laporan bulanan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah kamu yakin ingin menghapus snapshot laporan ini?")) return;
    try {
      await deleteReport(id);
    } catch (err) {
      alert(err.message || "Gagal menghapus laporan");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header & Action ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h3 className="font-semibold text-foreground">Riwayat Laporan Bulanan</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Snapshot statistik kas, infaq, jamaah, dan kendala terkunci per bulan untuk
            arsip pertanggungjawaban.
          </p>
        </div>

        {canEdit && (
          <Button
            onClick={handleOpenAdd}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Generate Snapshot Laporan
          </Button>
        )}
      </div>

      {/* ── Error Banner ────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* ── Reports Grid ────────────────────────────────── */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card rounded-xl border border-border">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm">Memuat arsip laporan bulanan...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-foreground">Belum ada snapshot laporan</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Klik tombol "Generate Snapshot Laporan" untuk mengunci data agregasi bulan ini
            menjadi arsip laporan bulanan resmi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((rep) => (
            <div
              key={rep._id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 hover:border-border/80 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground text-base">
                      {rep.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className="bg-zinc-500/10 text-zinc-600 border-zinc-500/20 text-[11px] gap-1"
                    >
                      <Lock className="w-3 h-3" />
                      Terkunci
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Periode: {MONTH_NAMES[rep.month - 1]} {rep.year} • Dibuat oleh{" "}
                    {rep.createdById?.name || "Admin"}
                  </span>
                </div>

                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(rep._id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Grid 4 Matriks */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Kas Saldo */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Saldo Akhir Kas</span>
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {formatRupiah(rep.summaryCash?.balance)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    + {formatRupiah(rep.summaryCash?.totalIncome)} / -{" "}
                    {formatRupiah(rep.summaryCash?.totalExpense)}
                  </div>
                </div>

                {/* Infaq */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <HeartHandshake className="w-3.5 h-3.5 text-sky-600" />
                    <span>Infaq Anggota</span>
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {formatRupiah(rep.summaryInfaq?.totalCollected)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {rep.summaryInfaq?.paidMembersCount} dari{" "}
                    {rep.summaryInfaq?.totalMembersCount} Anggota Lunas
                  </div>
                </div>

                {/* Data Jamaah */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Total Jamaah Binaan</span>
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {rep.summaryJamaah?.totalCongregants || 0} Orang
                  </div>
                </div>

                {/* Kendala */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Status Kendala</span>
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {rep.summaryIssues?.resolvedCount || 0} Selesai
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {(rep.summaryIssues?.openCount || 0) +
                      (rep.summaryIssues?.inProgressCount || 0)}{" "}
                    Perlu Ditindaklanjuti
                  </div>
                </div>
              </div>

              {rep.notes && (
                <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Catatan: </span>
                  {rep.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Dialog Buat Snapshot Laporan ───────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Snapshot Laporan Bulanan</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="text-xs p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Bulan
                </label>
                <select
                  value={formData.month}
                  onChange={(e) =>
                    setFormData({ ...formData, month: Number(e.target.value) })
                  }
                  className="w-full text-sm rounded-lg border border-border bg-background p-2.5"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Tahun
                </label>
                <select
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: Number(e.target.value) })
                  }
                  className="w-full text-sm rounded-lg border border-border bg-background p-2.5"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Judul Laporan *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Catatan / Evaluasi Ringkas
              </label>
              <textarea
                rows={3}
                placeholder="Rangkuman pencapaian atau evaluasi penting bulan ini..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full text-sm rounded-lg border border-border bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Kunci & Simpan Snapshot
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
