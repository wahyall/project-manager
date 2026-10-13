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
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Total Saldo Kas
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-950 dark:text-emerald-100">
            {formatRupiah(summary.totalBalance)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Akumulasi seluruh waktu
          </p>
        </div>

        {/* Pemasukan Bulan Ini */}
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
              Pemasukan Bulan Ini
            </span>
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-700 dark:text-sky-300">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-950 dark:text-sky-100">
            {formatRupiah(summary.monthIncome)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>

        {/* Pengeluaran Bulan Ini */}
        <div className="rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Pengeluaran Bulan Ini
            </span>
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-950 dark:text-rose-100">
            {formatRupiah(summary.monthExpense)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>

        {/* Arus Kas Bersih Bulan Ini */}
        <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Arus Kas Bersih
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-bold ${
            summary.monthBalance >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}>
            {formatRupiah(summary.monthBalance)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Pemasukan - Pengeluaran bulan ini
          </p>
        </div>
      </div>

      {/* ── Filter Bar & Actions ────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Pemilih Bulan */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="text-sm font-medium bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {MONTH_NAMES.map((mName, idx) => (
                <option key={idx} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>
          </div>

          {/* Pemilih Tahun */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-sm font-medium bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {[2024, 2025, 2026, 2027, 2028].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari transaksi / kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {canEdit && (
          <Button
            onClick={handleOpenAdd}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Catat Kas
          </Button>
        )}
      </div>

      {/* ── Error Banner ────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* ── Transaction Table ───────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm">Memuat catatan kas...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground">Belum ada transaksi kas</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Tidak ada catatan kas untuk {MONTH_NAMES[month - 1]} {year}. Klik tombol
              "Catat Kas" untuk menambah transaksi baru.
            </p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAdd}
                className="mt-4 gap-2"
              >
                <Plus className="w-4 h-4" />
                Catat Transaksi Pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
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
              <tbody className="divide-y divide-border/60">
                {transactions.map((tx) => (
                  <tr
                    key={tx._id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
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
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium"
                        >
                          Pemasukan
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium"
                        >
                          Pengeluaran
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-foreground">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground max-w-md line-clamp-2">
                        {tx.description}
                      </div>
                      {tx.receiptUrl && (
                        <a
                          href={tx.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline mt-0.5 inline-block"
                        >
                          Bukti Nota / Lampiran ↗
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-bold">
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
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(tx)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTx ? "Edit Transaksi Kas" : "Catat Transaksi Kas Baru"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="text-xs p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            {/* Tipe Transaksi */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Tipe Transaksi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "income" })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                    formData.type === "income"
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "expense" })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                    formData.type === "expense"
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Pengeluaran
                </button>
              </div>
            </div>

            {/* Nominal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Nominal (Rp) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
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
                  className="pl-10 font-medium"
                  required
                />
              </div>
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Kategori *
              </label>
              <Input
                type="text"
                placeholder="Pilih saran di bawah atau ketik manual"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CATEGORY_SUGGESTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat })}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors border border-border"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tanggal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Tanggal Transaksi *
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Keterangan / Rincian *
              </label>
              <textarea
                rows={3}
                placeholder="Rincian peruntukan atau sumber dana transaksi..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full text-sm rounded-lg border border-border bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            {/* URL Bukti Nota */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Link Bukti Nota / Foto (Opsional)
              </label>
              <Input
                type="url"
                placeholder="https://..."
                value={formData.receiptUrl}
                onChange={(e) =>
                  setFormData({ ...formData, receiptUrl: e.target.value })
                }
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
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingTx ? "Simpan Perubahan" : "Simpan Transaksi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
