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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card/60 backdrop-blur-xs p-3.5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Tipe */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter Tipe Kendala"
            className="text-xs font-semibold bg-background/80 border border-border/80 rounded-xl px-3 py-1.5 focus:outline-none"
          >
            <option value="all">Semua Tipe Kendala</option>
            <option value="internal_issue">Kendala Internal</option>
            <option value="cross_division_help">Bantuan Divisi Lain</option>
          </select>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter Status Kendala"
            className="text-xs font-semibold bg-background/80 border border-border/80 rounded-xl px-3 py-1.5 focus:outline-none"
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
            className="h-8.5 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Catat Kendala / Bantuan
          </Button>
        )}
      </div>

      {/* ── Error Banner ────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {/* ── Issues List ─────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card/60 backdrop-blur-xs rounded-2xl border border-border/80">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-medium">Memuat kendala dan koordinasi...</span>
          </div>
        ) : issues.length === 0 ? (
          <div className="p-16 text-center bg-card/60 backdrop-blur-xs rounded-2xl border border-border/80">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">Tidak ada kendala aktif</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
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
                className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-5 shadow-xs hover:border-border transition-all space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Tipe */}
                    {isCross ? (
                      <Badge
                        variant="outline"
                        className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25 font-bold text-[11px] rounded-lg gap-1"
                      >
                        <HelpCircle className="w-3 h-3" />
                        Bantuan Divisi Lain
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 font-bold text-[11px] rounded-lg gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Kendala Internal
                      </Badge>
                    )}

                    {/* Divisi Tujuan jika koordinasi */}
                    {isCross && item.targetDivisionId && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
                        <span>Ke:</span>
                        <span className="text-foreground">
                          {item.targetDivisionId.name}
                        </span>
                      </div>
                    )}

                    {/* Status Badge */}
                    {item.status === "resolved" ? (
                      <Badge className="bg-emerald-600 text-white font-bold text-[11px] rounded-lg">
                        Resolved
                      </Badge>
                    ) : item.status === "in_progress" ? (
                      <Badge className="bg-sky-600 text-white font-bold text-[11px] rounded-lg">
                        In Progress
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold text-[11px] rounded-lg">
                        Open
                      </Badge>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <select
                        value={item.status}
                        onChange={(e) => handleQuickStatus(item, e.target.value)}
                        aria-label="Set Status Cepat"
                        className="text-xs font-semibold bg-background/80 border border-border/80 rounded-lg px-2.5 py-1 cursor-pointer"
                      >
                        <option value="open">Set Open</option>
                        <option value="in_progress">Set In Progress</option>
                        <option value="resolved">Set Resolved</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                        onClick={() => handleDelete(item._id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* PIC & Action Plan Single Surface Blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 text-xs">
                    <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">PIC:</span>
                    <span className="font-semibold text-foreground truncate">
                      {item.picId?.name || "Belum ditentukan"}
                    </span>
                  </div>

                  {item.actionPlan ? (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/40 text-xs sm:col-span-1">
                      <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="text-muted-foreground font-medium">Rencana Aksi: </span>
                        <span className="text-foreground font-semibold">{item.actionPlan}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 text-xs text-muted-foreground italic">
                      Belum ada rencana tindak lanjut
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Dialog Tambah / Edit Kendala ───────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingIssue ? "Edit Kendala / Bantuan" : "Catat Kendala / Bantuan"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="text-xs p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium">
                {errorMessage}
              </div>
            )}

            {/* Tipe Kendala */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tipe Koordinasi *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "internal_issue" })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    formData.type === "internal_issue"
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-xs"
                      : "border-border/80 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Kendala Internal
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "cross_division_help" })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    formData.type === "cross_division_help"
                      ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "border-border/80 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  Bantuan Divisi Lain
                </button>
              </div>
            </div>

            {/* Target Divisi jika bantuan */}
            {formData.type === "cross_division_help" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Divisi Tujuan Bantuan *
                </label>
                <select
                  value={formData.targetDivisionId}
                  onChange={(e) =>
                    setFormData({ ...formData, targetDivisionId: e.target.value })
                  }
                  aria-label="Divisi Tujuan Bantuan"
                  className="w-full text-xs rounded-xl border border-border/80 bg-background/80 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                  required
                >
                  <option value="">Pilih Divisi Mitra</option>
                  {otherDivisions.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Judul Kendala */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Judul Kendala / Bantuan *
              </label>
              <Input
                type="text"
                placeholder="Ringkasan kendala atau bantuan yang dibutuhkan..."
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="text-xs rounded-xl border-border/80 font-semibold"
                required
              />
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Deskripsi Kendala (Opsional)
              </label>
              <textarea
                rows={3}
                placeholder="Jelaskan detail kendala, dampak, atau rincian bantuan..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full text-xs rounded-xl border border-border/80 bg-background/80 p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>

            {/* PIC dan Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  PIC Penanggung Jawab
                </label>
                <select
                  value={formData.picId}
                  onChange={(e) =>
                    setFormData({ ...formData, picId: e.target.value })
                  }
                  aria-label="PIC Penanggung Jawab"
                  className="w-full text-xs rounded-xl border border-border/80 bg-background/80 p-2.5 focus:outline-none font-semibold cursor-pointer"
                >
                  <option value="">Tanpa PIC</option>
                  {workspaceMembers.map((m) => (
                    <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                      {m.userId?.name || m.name || "Member"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  aria-label="Status Kendala"
                  className="w-full text-xs rounded-xl border border-border/80 bg-background/80 p-2.5 focus:outline-none font-semibold cursor-pointer"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Action Plan */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Rencana Aksi / Solusi (Opsional)
              </label>
              <Input
                type="text"
                placeholder="Langkah tindak lanjut..."
                value={formData.actionPlan}
                onChange={(e) =>
                  setFormData({ ...formData, actionPlan: e.target.value })
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
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}