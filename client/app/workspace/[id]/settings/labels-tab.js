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
import { Plus, Trash2, Loader2, Pencil, Tag } from "lucide-react";
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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Label Workspace
              </CardTitle>
              <CardDescription>
                Kelola label yang dapat digunakan untuk mengkategorikan task di
                workspace ini.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => handleOpenForm()}
            >
              <Plus className="h-4 w-4" />
              Buat Label Baru
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : labels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
              Belum ada label di workspace ini
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {labels.map((label) => (
                <div
                  key={label._id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card group hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className="h-4 w-4 rounded-full shrink-0 ring-1 ring-border shadow-sm"
                      style={{ backgroundColor: label.color }}
                    />
                    <span
                      className="text-sm font-medium truncate"
                      title={label.name}
                    >
                      {label.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleOpenForm(label)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
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
                          className="text-destructive hover:text-destructive"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLabel ? "Edit Label" : "Buat Label Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingLabel
                ? "Ubah nama atau warna label ini"
                : "Tambahkan label baru untuk workspace ini"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Label</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Mis: Bug, Feature, Urgent..."
                maxLength={50}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Warna</Label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="h-10 w-14 p-1 cursor-pointer rounded-md bg-background border"
                />
                <div className="flex-1 flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, color }))
                      }
                      className={`h-6 w-6 rounded-full border shadow-sm transition-transform hover:scale-110 ${
                        formData.color === color
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : "ring-1 ring-border/50"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Label</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus label "{deleteConfirm?.name}"? Label ini
              akan dihapus dari semua task yang menggunakannya. Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {deleting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
