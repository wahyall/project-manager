"use client";

import { useState } from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Trash2,
  Edit,
  Loader2,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  TrendingUp,
  Receipt,
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
import { useDivisionCash } from "@/hooks/use-division-cash";

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

const CATEGORY_SUGGESTIONS = [
  "Infaq Jamaah",
  "Donasi Khusus",
  "Kas Bulanan",
  "Konsumsi Rapat",
  "Operasional & Logistik",
  "Bisyarah Ustadz / Pemateri",
  "Peralatan & Perlengkapan",
  "Santunan / Bantuan Sosial",
  "Lain-lain",
];

export function DivisionCashTab({ workspaceId, divisionId, canEdit = true }) {
  const {
    transactions,
    summary,
    loading,
    error,
    month,
    setMonth,
    year,
    setYear,
    search,
    setSearch,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useDivisionCash(workspaceId, divisionId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    type: "income",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    receiptUrl: "",
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
    setEditingTx(null);
    setFormData({
      type: "income",
      amount: "",
      category: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      receiptUrl: "",
    });
    setErrorMessage("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setFormData({
      type: tx.type,
      amount: tx.amount.toString(),
      category: tx.category,
      date: tx.date ? new Date(tx.date).toISOString().split("T")[0] : "",
      description: tx.description,
      receiptUrl: tx.receiptUrl || "",
    });
    setErrorMessage("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      setErrorMessage("Nominal transaksi harus lebih dari 0");
      return;
    }
    if (!formData.category.trim()) {
      setErrorMessage("Pilih atau isi kategori transaksi");
      return;
    }
    if (!formData.description.trim()) {
      setErrorMessage("Keterangan transaksi wajib diisi");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    try {
      const payload = {
        type: formData.type,
        amount: Number(formData.amount),
        category: formData.category.trim(),
        date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
        description: formData.description.trim(),
        receiptUrl: formData.receiptUrl?.trim() || null,
      };

      if (editingTx) {
        await updateTransaction(editingTx._id, payload);
      } else {
        await createTransaction(payload);
      }
      setDialogOpen(false);
    } catch (err) {
      setErrorMessage(err.message || "Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (txId) => {
    if (!window.confirm("Apakah kamu yakin ingin menghapus transaksi ini?")) return;
    try {
      await deleteTransaction(txId);
    } catch (err) {
      alert(err.message || "Gagal menghapus transaksi");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Total */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-card/60 backdrop-blur-xs p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Saldo Kas
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {formatRupiah(summary.totalBalance)}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Akumulasi seluruh waktu
          </div>
        </div>

        {/* Pemasukan Bulan Ini */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-card/60 backdrop-blur-xs p-5 shadow-xs transition-all hover:shadow-md hover:border-sky-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pemasukan Bulan Ini
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatRupiah(summary.monthIncome)}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            {MONTH_NAMES[month - 1]} {year}
          </div>
        </div>

        {/* Pengeluaran Bulan Ini */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-card/60 backdrop-blur-xs p-5 shadow-xs transition-all hover:shadow-md hover:border-rose-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pengeluaran Bulan Ini
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {formatRupiah(summary.monthExpense)}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            {MONTH_NAMES[month - 1]} {year}
          </div>
        </div>

        {/* Arus Kas Bersih Bulan Ini */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-5 shadow-xs transition-all hover:shadow-md hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Arus Kas Bersih
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`mt-3 text-2xl font-bold tracking-tight ${
              summary.monthBalance >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatRupiah(summary.monthBalance)}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            Pemasukan dikurangi pengeluaran
          </div>
        </div>
      </div>

      {/* ── Filter Bar & Actions ────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card/60 backdrop-blur-xs p-3.5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pemilih Bulan & Tahun */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              aria-label="Pilih Bulan"
              className="text-xs font-semibold bg-transparent focus:outline-none cursor-pointer py-1"
            >
              {MONTH_NAMES.map((mName, idx) => (
                <option key={idx} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground/40">/</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="Pilih Tahun"
              className="text-xs font-semibold bg-transparent focus:outline-none cursor-pointer py-1"
            >
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari transaksi / kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8.5 h-8.5 text-xs rounded-xl bg-background/80 border-border/80"
            />
          </div>
        </div>

        {canEdit && (
          <Button
            onClick={handleOpenAdd}
            className="h-8.5 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Catat Kas Baru
          </Button>
        )}
      </div>

      {/* ── Error Banner ────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {/* ── Transaction Table ───────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-medium">Memuat catatan kas...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">Belum ada transaksi kas</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Tidak ada catatan kas untuk {MONTH_NAMES[month - 1]} {year}. Klik tombol
              "Catat Kas Baru" untuk memulai.
            </p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAdd}
                className="mt-4 gap-1.5 h-8 text-xs rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Transaksi Pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border/80 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  <th className="px-4 py-3">Pencatat</th>
                  {canEdit && <th className="px-4 py-3 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {transactions.map((tx) => (
                  <tr
                    key={tx._id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-medium">
                      {tx.date
                        ? new Date(tx.date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tx.type === "income" ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 font-semibold text-[11px] rounded-lg"
                        >
                          Pemasukan
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 font-semibold text-[11px] rounded-lg"
                        >
                          Pengeluaran
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-foreground">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground max-w-md line-clamp-2 leading-relaxed">
                        {tx.description}
                      </div>
                      {tx.receiptUrl && (
                        <a
                          href={tx.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary hover:underline mt-1 inline-flex items-center gap-1 font-medium"
                        >
                          Bukti Nota / Lampiran ↗
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-sm">
                      {tx.type === "income" ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          + {formatRupiah(tx.amount)}
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400">
                          - {formatRupiah(tx.amount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {tx.createdBy?.name || "-"}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                            onClick={() => handleOpenEdit(tx)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                            onClick={() => handleDelete(tx._id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Dialog Tambah / Edit Transaksi ────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingTx ? "Edit Transaksi Kas" : "Catat Transaksi Kas Baru"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="text-xs p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium">
                {errorMessage}
              </div>
            )}

            {/* Tipe Transaksi */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tipe Transaksi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "income" })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    formData.type === "income"
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "border-border/80 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "expense" })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    formData.type === "expense"
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-xs"
                      : "border-border/80 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Pengeluaran
                </button>
              </div>
            </div>

            {/* Nominal */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Nominal (Rp) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  Rp
                </span>
                <Input
                  type="number"
                  min="0"
                  placeholder="Contoh: 150000"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="pl-9 text-sm font-semibold rounded-xl border-border/80"
                  required
                />
              </div>
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Kategori *
              </label>
              <Input
                type="text"
                placeholder="Pilih saran di bawah atau ketik manual"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="text-xs rounded-xl border-border/80"
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CATEGORY_SUGGESTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat })}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground transition-colors border border-border/60"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tanggal */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tanggal Transaksi *
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="text-xs rounded-xl border-border/80"
                required
              />
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Keterangan / Rincian *
              </label>
              <textarea
                rows={3}
                placeholder="Rincian peruntukan atau sumber dana transaksi..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full text-xs rounded-xl border border-border/80 bg-background/80 p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                required
              />
            </div>

            {/* URL Bukti Nota */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Link Bukti Nota / Foto (Opsional)
              </label>
              <Input
                type="url"
                placeholder="https://..."
                value={formData.receiptUrl}
                onChange={(e) =>
                  setFormData({ ...formData, receiptUrl: e.target.value })
                }
                className="text-xs rounded-xl border-border/80"
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
                {editingTx ? "Simpan Perubahan" : "Simpan Transaksi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}