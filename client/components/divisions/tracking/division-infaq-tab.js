"use client";

import { useState } from "react";
import {
  HeartHandshake,
  CheckCircle2,
  Clock,
  Calendar,
  Loader2,
  Edit,
  DollarSign,
  UserCheck,
  RotateCcw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDivisionInfaq } from "@/hooks/use-division-infaq";

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

export function DivisionInfaqTab({ workspaceId, divisionId, canEdit = true }) {
  const {
    records,
    summary,
    loading,
    error,
    month,
    setMonth,
    year,
    setYear,
    recordInfaq,
    togglePaid,
  } = useDivisionInfaq(workspaceId, divisionId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formData, setFormData] = useState({
    amount: "20000",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
    isPaid: true,
  });

  const formatRupiah = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const percentPaid =
    summary.totalMembers > 0
      ? Math.round((summary.paidMembers / summary.totalMembers) * 100)
      : 0;

  const filteredRecords = (records || []).filter((r) => {
    if (statusFilter === "paid" && !r.isPaid) return false;
    if (statusFilter === "unpaid" && r.isPaid) return false;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const name = (r.member?.name || "").toLowerCase();
      const email = (r.member?.email || "").toLowerCase();
      const notes = (r.notes || "").toLowerCase();
      return name.includes(q) || email.includes(q) || notes.includes(q);
    }
    return true;
  });

  const handleQuickToggle = async (rec) => {
    setTogglingId(rec.member._id);
    try {
      await togglePaid(rec.member._id, rec.isPaid, 20000);
    } catch (err) {
      alert(err.message || "Gagal mengubah status infaq");
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenEdit = (rec) => {
    setSelectedRecord(rec);
    setFormData({
      amount: (rec.amount || 20000).toString(),
      paymentDate: rec.paymentDate
        ? new Date(rec.paymentDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      notes: rec.notes || "",
      isPaid: rec.isPaid ?? true,
    });
    setDialogOpen(true);
  };

  const handleSaveDetail = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setSaving(true);
    try {
      await recordInfaq({
        memberUserId: selectedRecord.member._id,
        isPaid: formData.isPaid,
        amount: Number(formData.amount) || 0,
        paymentDate: formData.isPaid ? formData.paymentDate : null,
        notes: formData.notes.trim(),
      });
      setDialogOpen(false);
    } catch (err) {
      alert(err.message || "Gagal menyimpan rincian infaq");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Stat Cards & Progress ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Terkumpul */}
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Total Infaq Terkumpul
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-950 dark:text-emerald-100">
            {formatRupiah(summary.totalAmountCollected)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Bulan {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>

        {/* Progress Pembayaran */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Progress Anggota Membayar
              </span>
              <span className="text-sm font-bold text-foreground">
                {summary.paidMembers} dari {summary.totalMembers} Anggota ({percentPaid}%)
              </span>
            </div>
            <Progress value={percentPaid} className="h-2.5" />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{summary.paidMembers} Lunas</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{summary.unpaidMembers} Belum Membayar</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
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
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm font-medium bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Semua Status</option>
            <option value="paid">Lunas ({summary.paidMembers})</option>
            <option value="unpaid">Belum Bayar ({summary.unpaidMembers})</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari anggota workspace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground hidden lg:block">
          Iuran seluruh anggota workspace: <span className="font-semibold text-foreground">Rp 20.000 / bln</span>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* ── Member Infaq Table ──────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm">Memuat data infaq anggota...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="text-sm">Tidak ada anggota workspace yang cocok dengan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3">Nama Anggota Workspace</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3">Status Infaq</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  <th className="px-4 py-3">Tgl Bayar</th>
                  <th className="px-4 py-3">Catatan</th>
                  {canEdit && <th className="px-4 py-3 text-center">Aksi Cepat</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRecords.map((rec) => {
                  const isToggling = togglingId === rec.member._id;
                  return (
                    <tr
                      key={rec.member._id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 text-xs">
                            <AvatarImage src={rec.member.avatar} />
                            <AvatarFallback>
                              {rec.member.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">
                              {rec.member.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {rec.member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground capitalize">
                        {rec.member.roleInWorkspace || "member"}
                        {rec.member.roleInDivision && (
                          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">
                            BM: {rec.member.roleInDivision}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {rec.isPaid ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            LUNAS
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium gap-1"
                          >
                            <Clock className="w-3 h-3" />
                            BELUM BAYAR
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                        {rec.isPaid ? (
                          <span className="text-foreground">
                            {formatRupiah(rec.amount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {rec.paymentDate
                          ? new Date(rec.paymentDate).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {rec.notes || "-"}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant={rec.isPaid ? "outline" : "default"}
                              disabled={isToggling}
                              onClick={() => handleQuickToggle(rec)}
                              className={`h-7 px-2.5 text-xs font-medium gap-1 ${
                                rec.isPaid
                                  ? "text-muted-foreground hover:text-foreground"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              {isToggling ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : rec.isPaid ? (
                                <>
                                  <RotateCcw className="w-3 h-3" />
                                  Batal
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  Tandai Lunas
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(rec)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Dialog Edit Detail Infaq ───────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Detail Infaq: {selectedRecord?.member?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveDetail} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Status Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPaid: true })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                    formData.isPaid
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 font-bold"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Lunas
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPaid: false })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                    !formData.isPaid
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-600 font-bold"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Belum Bayar
                </button>
              </div>
            </div>

            {formData.isPaid && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Nominal (Rp)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Tanggal Pembayaran
                  </label>
                  <Input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentDate: e.target.value })
                    }
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Catatan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Catatan transfer, titipan, dll..."
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
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
