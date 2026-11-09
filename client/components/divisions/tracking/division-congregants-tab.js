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

export function DivisionCongregantsTab({
  workspaceId,
  divisionId,
  canEdit = true,
}) {
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
    if (!window.confirm("Apakah kamu yakin ingin menghapus data jamaah ini?"))
      return;
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
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 font-semibold text-[11px] rounded-lg"
          >
            Mustahik
          </Badge>
        );
      case "donatur":
        return (
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25 font-semibold text-[11px] rounded-lg"
          >
            Donatur
          </Badge>
        );
      case "jamaah_rutin":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 font-semibold text-[11px] rounded-lg"
          >
            Jamaah Rutin
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-muted text-muted-foreground border-border/80 font-semibold text-[11px] rounded-lg"
          >
            Lainnya
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Search & Filter Bar ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card/60 backdrop-blur-xs p-3.5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama, telepon, domisili..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8.5 h-8.5 text-xs rounded-xl bg-background/80 border-border/80"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter Kategori Jamaah"
            className="text-xs font-semibold bg-background/80 border border-border/80 rounded-xl px-3 py-1.5 focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden lg:inline font-medium">
            Total Jamaah:{" "}
            <span className="font-bold text-foreground">{totalCount}</span>
          </span>
          {canEdit && (
            <Button
              onClick={handleOpenAdd}
              className="h-8.5 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Jamaah
            </Button>
          )}
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {/* ── Congregant Table ────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-medium">Memuat data jamaah...</span>
          </div>
        ) : congregants.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">
              Tidak ada data jamaah
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Belum ada data jamaah yang tersimpan atau sesuai kriteria filter
              saat ini.
            </p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAdd}
                className="mt-4 gap-1.5 h-8 text-xs rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Jamaah Baru
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border/80 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3">Nama Jamaah</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Kontak WA</th>
                  <th className="px-4 py-3">Alamat / Domisili</th>
                  <th className="px-4 py-3">Kunjungan Terakhir</th>
                  <th className="px-4 py-3">Catatan</th>
                  {canEdit && <th className="px-4 py-3 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {congregants.map((c) => {
                  const waLink = getWaLink(c.phone);
                  return (
                    <tr
                      key={c._id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-foreground">
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
                                title="Chat via WhatsApp"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                              >
                                <MessageCircle className="w-3 h-3" />
                                WA
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {c.address ? (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
                            {c.address}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {c.lastVisitedAt
                          ? new Date(c.lastVisitedAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )
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
                              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                              onClick={() => handleOpenEdit(c)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
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
        <DialogContent className="sm:max-w-md rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingItem ? "Edit Data Jamaah" : "Tambah Data Jamaah"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="text-xs p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium">
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Nama Lengkap *
              </label>
              <Input
                type="text"
                placeholder="Contoh: Bpk. H. Ahmad Sudirman"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="text-xs rounded-xl border-border/80 font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Nomor Telepon / WhatsApp
              </label>
              <Input
                type="text"
                placeholder="081234567890"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="text-xs rounded-xl border-border/80"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Kategori Jamaah
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                aria-label="Kategori Jamaah Form"
                className="w-full text-xs rounded-xl border border-border/80 bg-background/80 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold cursor-pointer"
              >
                <option value="jamaah_rutin">Jamaah Rutin</option>
                <option value="mustahik">Mustahik</option>
                <option value="donatur">Donatur</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Alamat / Domisili
              </label>
              <Input
                type="text"
                placeholder="RT/RW atau nama jalan/gang"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="text-xs rounded-xl border-border/80"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Kunjungan Terakhir (Opsional)
              </label>
              <Input
                type="date"
                value={formData.lastVisitedAt}
                onChange={(e) =>
                  setFormData({ ...formData, lastVisitedAt: e.target.value })
                }
                className="text-xs rounded-xl border-border/80"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Catatan Khusus (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Catatan kebiasaan, preferensi, atau kondisi khusus..."
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
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
