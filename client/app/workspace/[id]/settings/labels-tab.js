"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Trash2, Loader2, Pencil, Tag, Check } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const DEFAULT_COLORS = [
  "#6B7280",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#84CC16",
  "#14B8A6",
  "#F43F5E",
];

export default function LabelsTab({ workspace }) {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    color: DEFAULT_COLORS[0],
  });
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLabels = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/workspaces/${workspace._id}/labels`);
      setLabels(data.data.labels);
    } catch (error) {
      toast.error("Gagal mengambil data label");
    } finally {
      setLoading(false);
    }
  }, [workspace._id]);

  useEffect(() => {
    if (workspace?._id) {
      fetchLabels();
    }
  }, [workspace._id, fetchLabels]);

  const handleOpenForm = (label = null) => {
    if (label) {
      setEditingLabel(label);
      setFormData({ name: label.name, color: label.color });
    } else {
      setEditingLabel(null);
      setFormData({
        name: "",
        color:
          DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      });
    }
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nama label harus diisi");
      return;
    }

    setSaving(true);
    try {
      if (editingLabel) {
        const { data } = await api.put(
          `/workspaces/${workspace._id}/labels/${editingLabel._id}`,
          { name: formData.name.trim(), color: formData.color },
        );
        setLabels((prev) =>
          prev.map((l) => (l._id === editingLabel._id ? data.data.label : l)),
        );
        toast.success("Label berhasil diperbarui");
      } else {
        const { data } = await api.post(`/workspaces/${workspace._id}/labels`, {
          name: formData.name.trim(),
          color: formData.color,
        });
        setLabels((prev) =>
          [...prev, data.data.label].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        toast.success("Label berhasil dibuat");
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menyimpan label");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.delete(
        `/workspaces/${workspace._id}/labels/${deleteConfirm._id}`,
      );
      setLabels((prev) => prev.filter((l) => l._id !== deleteConfirm._id));
      toast.success("Label berhasil dihapus");
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menghapus label");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Label Workspace
                </CardTitle>
                <CardDescription className="text-xs">
                  Kelola tag dan klasifikasi warna untuk membedakan task serta prioritas
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-2 shrink-0 rounded-xl h-9 text-xs shadow-xs"
              onClick={() => handleOpenForm()}
            >
              <Plus className="h-4 w-4" />
              Buat Label Baru
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Memuat label...</p>
            </div>
          ) : labels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border/80 rounded-xl">
              <p className="font-medium text-foreground">Belum ada label</p>
              <p className="text-xs text-muted-foreground mt-1">
                Buat label baru untuk mengorganisasi dan memfilter task secara efisien.
              </p>
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {labels.map((label) => (
                <div
                  key={label._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-background/50 hover:bg-muted/30 hover:border-primary/40 transition-all group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs ring-2 ring-background"
                      style={{ backgroundColor: label.color }}
                    />
                    <span
                      className="text-xs font-medium text-foreground truncate"
                      title={label.name}
                    >
                      {label.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleOpenForm(label)}
                          className="h-7 w-7 rounded-lg"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit label</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteConfirm(label)}
                          className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Hapus label</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: formData.color }}
              >
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {editingLabel ? "Edit Label" : "Buat Label Baru"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {editingLabel
                    ? "Sesuaikan nama dan warna label ini"
                    : "Tambahkan label kategori untuk proyek kamu"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nama Label</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Mis: Bug, Mendesak, Prioritas Tinggi..."
                maxLength={50}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                autoFocus
                className="rounded-xl h-10 bg-background/50 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Pilihan Warna</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="h-10 w-12 p-1 cursor-pointer rounded-xl bg-background border border-border shrink-0"
                />
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {DEFAULT_COLORS.map((color) => {
                    const isSelected = formData.color.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, color }))
                        }
                        className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-all ${
                          isSelected
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                            : "opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="ghost"
              onClick={() => setFormOpen(false)}
              disabled={saving}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="rounded-xl text-xs gap-1.5 shadow-xs"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Menyimpan..." : "Simpan Label"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent className="rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Hapus Label
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Yakin ingin menghapus label "{deleteConfirm?.name}"? Label ini
              akan dilepaskan dari semua task yang menggunakannya. Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel disabled={deleting} className="rounded-xl text-xs">
              Batal
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
              className="rounded-xl text-xs gap-1.5"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {deleting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
