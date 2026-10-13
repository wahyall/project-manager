"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Plus,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  Loader2,
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
import { useDivisionCongregants } from "@/hooks/use-division-congregants";

const CATEGORIES = [
  { value: "all", label: "Semua Kategori" },
  { value: "jamaah_rutin", label: "Jamaah Rutin" },
  { value: "mustahik", label: "Mustahik" },
  { value: "donatur", label: "Donatur" },
  { value: "lainnya", label: "Lainnya" },
];

export function DivisionCongregantsTab({ workspaceId, divisionId, canEdit = true }) {
  const {
    congregants,
    totalCount,
    loading,
    error,
    search,
    setSearch,
    category,
    setCategory,
    createCongregant,
    updateCongregant,
    deleteCongregant,
  } = useDivisionCongregants(workspaceId, divisionId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    category: "jamaah_rutin",
    notes: "",
    lastVisitedAt: "",
  });

  const getWaLink = (phoneStr) => {
    if (!phoneStr) return null;
    let clean = phoneStr.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.substring(1);
    } else if (clean.startsWith("8")) {
      clean = "62" + clean;
    }
    return `https://wa.me/${clean}`;
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      phone: "",
      address: "",
      category: "jamaah_rutin",
      notes: "",
      lastVisitedAt: "",
    });
    setErrorMessage("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingItem(c);
    setFormData({
      name: c.name,
      phone: c.phone || "",
      address: c.address || "",
      category: c.category || "jamaah_rutin",
      notes: c.notes || "",
      lastVisitedAt: c.lastVisitedAt
        ? new Date(c.lastVisitedAt).toISOString().split("T")[0]
        : "",
    });
    setErrorMessage("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage("Nama jamaah wajib diisi");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        category: formData.category,
        notes: formData.notes.trim(),
        lastVisitedAt: formData.lastVisitedAt
          ? new Date(formData.lastVisitedAt).toISOString()
          : null,
      };

      if (editingItem) {
        await updateCongregant(editingItem._id, payload);
      } else {
        await createCongregant(payload);
      }
      setDialogOpen(false);
    } catch (err) {
      setErrorMessage(err.message || "Gagal menyimpan data jamaah");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah kamu yakin ingin menghapus data jamaah ini?")) return;
    try {
      await deleteCongregant(id);
    } catch (err) {
      alert(err.message || "Gagal menghapus data jamaah");
    }
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case "mustahik":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            Mustahik
          </Badge>
        );
      case "donatur":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
            Donatur
          </Badge>
        );
      case "jamaah_rutin":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            Jamaah Rutin
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 border-zinc-500/20">
            Lainnya
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Search & Filter Bar ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama, telepon, alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-sm font-medium bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden lg:inline">
            Total Jamaah: <span className="font-semibold text-foreground">{totalCount}</span>
          </span>
          {canEdit && (
            <Button
              onClick={handleOpenAdd}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Jamaah
            </Button>
          )}
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* ── Congregant Cards / Table ────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm">Memuat data jamaah...</span>
          </div>
        ) : congregants.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground">Tidak ada data jamaah</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Belum ada data jamaah yang tersimpan atau sesuai kriteria pencarian.
            </p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAdd}
                className="mt-4 gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah Jamaah Baru
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3">Nama Jamaah</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Kontak WA</th>
                  <th className="px-4 py-3">Alamat</th>
                  <th className="px-4 py-3">Kunjungan Terakhir</th>
                  <th className="px-4 py-3">Catatan</th>
                  {canEdit && <th className="px-4 py-3 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {congregants.map((c) => {
                  const waLink = getWaLink(c.phone);
                  return (
                    <tr key={c._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                        {c.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getCategoryBadge(c.category)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.phone ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              {c.phone}
                            </span>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                title="Chat WhatsApp"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                              >
                                <MessageCircle className="w-3 h-3" />
                                WA
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {c.address ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
                            {c.address}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {c.lastVisitedAt
                          ? new Date(c.lastVisitedAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {c.notes || "-"}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(c)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(c._id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* ── Dialog Tambah / Edit Jamaah ────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Data Jamaah" : "Tambah Data Jamaah"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="text-xs p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Nama Lengkap *
              </label>
              <Input
                type="text"
                placeholder="Contoh: Bpk. H. Ahmad Sudirman"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Nomor Telepon / WhatsApp
              </label>
              <Input
                type="text"
                placeholder="081234567890"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Kategori Jamaah
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full text-sm rounded-lg border border-border bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="jamaah_rutin">Jamaah Rutin</option>
                <option value="mustahik">Mustahik</option>
                <option value="donatur">Donatur</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Alamat / Domisili
              </label>
              <Input
                type="text"
                placeholder="RT/RW atau nama jalan/gang"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Kunjungan Terakhir (Opsional)
              </label>
              <Input
                type="date"
                value={formData.lastVisitedAt}
                onChange={(e) =>
                  setFormData({ ...formData, lastVisitedAt: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Catatan Khusus (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Catatan kebiasaan, preferensi, atau kondisi khusus..."
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
