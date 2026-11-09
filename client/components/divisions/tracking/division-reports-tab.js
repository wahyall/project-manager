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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-xs p-4 rounded-2xl border border-border/80 shadow-xs">
        <div>
          <h3 className="font-bold text-foreground text-sm">Riwayat Laporan Bulanan</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Snapshot statistik kas, infaq, jamaah, dan kendala terkunci per bulan untuk
            arsip pertanggungjawaban.
          </p>
        </div>

        {canEdit && (
          <Button
            onClick={handleOpenAdd}
            className="h-8.5 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate Snapshot Laporan
          </Button>
        )}
      </div>

      {/* ── Error Banner ────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {/* ── Reports Grid ────────────────────────────────── */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card/60 backdrop-blur-xs rounded-2xl border border-border/80">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs font-medium">Memuat arsip laporan bulanan...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-16 text-center bg-card/60 backdrop-blur-xs rounded-2xl border border-border/80">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">Belum ada snapshot laporan</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Klik tombol "Generate Snapshot Laporan" untuk mengunci data agregasi bulan ini
            menjadi arsip laporan bulanan resmi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((rep) => (
            <div
              key={rep._id}
              className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-5 shadow-xs space-y-4 hover:border-border transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground text-sm">
                      {rep.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground border-border/80 text-[10px] font-semibold rounded-md gap-1"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      Terkunci
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5 inline-block">
                    Periode: {MONTH_NAMES[rep.month - 1]} {rep.year} • Dibuat oleh{" "}
                    {rep.createdById?.name || "Admin"}
                  </span>
                </div>

                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg shrink-0"
                    onClick={() => handleDelete(rep._id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Grid 4 Matriks */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Kas Saldo */}
                <div className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
                    <Wallet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
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
                <div className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
                    <HeartHandshake className="w-3 h-3 text-sky-600 dark:text-sky-400" />
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
                <div className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
                    <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Total Jamaah Binaan</span>
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {rep.summaryJamaah?.totalCongregants || 0} Orang
                  </div>
                </div>

                {/* Kendala */}
                <div className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
                    <CheckCircle2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
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
                <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground leading-relaxed">
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
        <DialogContent className="sm:max-w-md rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Generate Snapshot Laporan Bulanan</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="text-xs p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Bulan
                </label>
                <select
                  value={formData.month}
                  onChange={(e) =>
                    setFormData({ ...formData, month: Number(e.target.value) })
                  }
                  aria-label="Pilih Bulan Snapshot"
                  className="w-full text-xs rounded-xl border border-border/80 bg-background/80 p-2.5 font-semibold cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Tahun
                </label>
                <select
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: Number(e.target.value) })
                  }
                  aria-label="Pilih Tahun Snapshot"
                  className="w-full text-xs rounded-xl border border-border/80 bg-background/80 p-2.5 font-semibold cursor-pointer"
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
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Judul Laporan *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="text-xs rounded-xl border-border/80 font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Catatan / Evaluasi Ringkas
              </label>
              <textarea
                rows={3}
                placeholder="Rangkuman pencapaian atau evaluasi penting bulan ini..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full text-xs rounded-xl border border-border/80 bg-background/80 p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="h-9 rounded-xl text-xs font-semibold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Kunci & Simpan Snapshot
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}