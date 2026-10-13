"use client";

import { useState } from "react";
import {
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Loader2,
  User,
  Trash2,
  Edit,
  Building2,
  ShieldCheck,
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
import { useDivisionIssues } from "@/hooks/use-division-issues";

export function DivisionIssuesTab({
  workspaceId,
  divisionId,
  allDivisions = [],
  workspaceMembers = [],
  canEdit = true,
}) {
  const {
    issues,
    loading,
    error,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    createIssue,
    updateIssue,
    deleteIssue,
  } = useDivisionIssues(workspaceId, divisionId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    type: "internal_issue",
    targetDivisionId: "",
    title: "",
    description: "",
    picId: "",
    status: "open",
    actionPlan: "",
  });

  const otherDivisions = allDivisions.filter((d) => d._id !== divisionId);

  const handleOpenAdd = () => {
    setEditingIssue(null);
    setFormData({
      type: "internal_issue",
      targetDivisionId: otherDivisions[0]?._id || "",
      title: "",
      description: "",
      picId: "",
      status: "open",
      actionPlan: "",
    });
    setErrorMessage("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingIssue(item);
    setFormData({
      type: item.type,
      targetDivisionId: item.targetDivisionId?._id || item.targetDivisionId || "",
      title: item.title,
      description: item.description || "",
      picId: item.picId?._id || item.picId || "",
      status: item.status,
      actionPlan: item.actionPlan || "",
    });
    setErrorMessage("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMessage("Judul kendala wajib diisi");
      return;
    }
    if (formData.type === "cross_division_help" && !formData.targetDivisionId) {
      setErrorMessage("Pilih divisi tujuan koordinasi / permohonan bantuan");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    try {
      const payload = {
        type: formData.type,
        targetDivisionId:
          formData.type === "cross_division_help" ? formData.targetDivisionId : null,
        title: formData.title.trim(),
        description: formData.description.trim(),
        picId: formData.picId || null,
        status: formData.status,
        actionPlan: formData.actionPlan.trim(),
      };

      if (editingIssue) {
        await updateIssue(editingIssue._id, payload);
      } else {
        await createIssue(payload);
      }
      setDialogOpen(false);
    } catch (err) {
      setErrorMessage(err.message || "Gagal menyimpan kendala");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (issue, newStatus) => {
    try {
      await updateIssue(issue._id, { status: newStatus });
    } catch (err) {
      alert(err.message || "Gagal memperbarui status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah kamu yakin ingin menghapus catatan kendala ini?")) return;
    try {
      await deleteIssue(id);
    } catch (err) {
      alert(err.message || "Gagal menghapus kendala");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Filter Bar & Actions ────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Tipe */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm font-medium bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Semua Tipe Kendala</option>
            <option value="internal_issue">Kendala Internal</option>
            <option value="cross_division_help">Koordinasi Bantuan Divisi Lain</option>
          </select>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm font-medium bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Semua Status</option>
            <option value="open">Open (Belum Ditangani)</option>
            <option value="in_progress">In Progress (Sedang Berjalan)</option>
            <option value="resolved">Resolved (Terselesaikan)</option>
          </select>
        </div>

        {canEdit && (
          <Button
            onClick={handleOpenAdd}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Catat Kendala / Bantuan
          </Button>
        )}
      </div>

      {/* ── Error Banner ────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* ── Issues List ─────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card rounded-xl border border-border">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm">Memuat kendala dan koordinasi...</span>
          </div>
        ) : issues.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-xl border border-border">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground">Tidak ada kendala aktif</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Seluruh operasional berjalan lancar tanpa kendala atau kebutuhan bantuan yang
              tercatat.
            </p>
          </div>
        ) : (
          issues.map((item) => {
            const isCross = item.type === "cross_division_help";
            return (
              <div
                key={item._id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm hover:border-border/80 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Tipe */}
                    {isCross ? (
                      <Badge
                        variant="outline"
                        className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-semibold gap-1"
                      >
                        <HelpCircle className="w-3 h-3" />
                        Bantuan Divisi Lain
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Kendala Internal
                      </Badge>
                    )}

                    {/* Divisi Tujuan jika koordinasi */}
                    {isCross && item.targetDivisionId && (
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        <span>Ke:</span>
                        <span className="font-semibold text-foreground">
                          {item.targetDivisionId.name}
                        </span>
                      </div>
                    )}

                    {/* Status Badge */}
                    {item.status === "resolved" ? (
                      <Badge className="bg-emerald-600 text-white font-medium">
                        Resolved
                      </Badge>
                    ) : item.status === "in_progress" ? (
                      <Badge className="bg-sky-600 text-white font-medium">
                        In Progress
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-500 font-medium">
                        Open
                      </Badge>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <select
                        value={item.status}
                        onChange={(e) => handleQuickStatus(item, e.target.value)}
                        className="text-xs font-medium bg-background border border-border rounded-md px-2 py-1"
                      >
                        <option value="open">Set Open</option>
                        <option value="in_progress">Set In Progress</option>
                        <option value="resolved">Set Resolved</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(item._id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Judul & Deskripsi */}
                <div>
                  <h4 className="font-semibold text-foreground text-base">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Tindak Lanjut & PIC */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60 text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground block mb-0.5">
                      Rencana Tindak Lanjut:
                    </span>
                    <span className="text-foreground">
                      {item.actionPlan || "Belum ada rencana tindak lanjut tercatat."}
                    </span>
                  </div>
                  <div className="flex flex-col sm:items-end justify-center">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      <span>PIC:</span>
                      <span className="font-semibold text-foreground">
                        {item.picId?.name || "Belum ditentukan"}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      Dicatat oleh {item.createdBy?.name || "-"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Dialog Tambah / Edit Kendala ────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingIssue ? "Edit Kendala & Koordinasi" : "Catat Kendala / Bantuan"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="text-xs p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            {/* Tipe Kendala */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Tipe Catatan
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "internal_issue" })}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                    formData.type === "internal_issue"
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-600 font-bold"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Kendala Internal
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, type: "cross_division_help" })
                  }
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                    formData.type === "cross_division_help"
                      ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-600 font-bold"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Bantuan Divisi Lain
                </button>
              </div>
            </div>

            {/* Jika butuh bantuan divisi lain, pilih target divisi */}
            {formData.type === "cross_division_help" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Divisi yang Dimintai Bantuan *
                </label>
                <select
                  value={formData.targetDivisionId}
                  onChange={(e) =>
                    setFormData({ ...formData, targetDivisionId: e.target.value })
                  }
                  className="w-full text-sm rounded-lg border border-border bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Pilih Divisi...</option>
                  {otherDivisions.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Judul Kendala / Bantuan *
              </label>
              <Input
                type="text"
                placeholder="Contoh: Sound system masjid kresek / Butuh bantuan kebersihan"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Deskripsi Rinci
              </label>
              <textarea
                rows={3}
                placeholder="Jelaskan detail permasalahan atau bantuan yang dibutuhkan..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full text-sm rounded-lg border border-border bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Penanggung Jawab (PIC)
                </label>
                <select
                  value={formData.picId}
                  onChange={(e) =>
                    setFormData({ ...formData, picId: e.target.value })
                  }
                  className="w-full text-sm rounded-lg border border-border bg-background p-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Pilih PIC...</option>
                  {workspaceMembers.map((m) => {
                    const u = m.userId || m;
                    return (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full text-sm rounded-lg border border-border bg-background p-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Rencana Tindak Lanjut (Action Plan)
              </label>
              <textarea
                rows={2}
                placeholder="Langkah konkret penyelesaian atau kesepakatan solusi..."
                value={formData.actionPlan}
                onChange={(e) =>
                  setFormData({ ...formData, actionPlan: e.target.value })
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
