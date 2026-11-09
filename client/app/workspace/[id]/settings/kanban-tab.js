"use client";

import { useState, useCallback } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  GripVertical,
  Trash2,
  Loader2,
  Save,
  Pencil,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Columns3,
} from "lucide-react";
import { toast } from "sonner";

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
];

function ColumnItem({
  column,
  index,
  totalColumns,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);

  const handleSaveName = () => {
    if (!editName.trim()) {
      setEditName(column.name);
      setEditing(false);
      return;
    }
    onUpdate(index, { ...column, name: editName.trim() });
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSaveName();
    if (e.key === "Escape") {
      setEditName(column.name);
      setEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl border border-border/70 bg-background/50 group hover:border-primary/40 hover:bg-muted/30 transition-all shadow-2xs">
      {/* Drag handle */}
      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />

      {/* Color picker */}
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="shrink-0 cursor-pointer">
            <input
              type="color"
              value={column.color}
              onChange={(e) =>
                onUpdate(index, { ...column, color: e.target.value })
              }
              className="sr-only"
            />
            <div
              className="h-5 w-5 rounded-lg border border-border/50 shadow-2xs transition-transform hover:scale-110"
              style={{ backgroundColor: column.color }}
            />
          </label>
        </TooltipTrigger>
        <TooltipContent>Ubah warna kolom</TooltipContent>
      </Tooltip>

      {/* Name */}
      {editing ? (
        <div className="flex-1 flex items-center gap-1.5">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-xs rounded-lg bg-background"
            maxLength={50}
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleSaveName}
            className="h-7 w-7 text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setEditName(column.name);
              setEditing(false);
            }}
            className="h-7 w-7 text-muted-foreground rounded-lg"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <span
          className="flex-1 text-xs font-medium text-foreground cursor-pointer hover:text-primary transition-colors select-none"
          onDoubleClick={() => setEditing(true)}
          title="Klik ganda untuk rename"
        >
          {column.name}
        </span>
      )}

      {/* Quick color presets */}
      <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {DEFAULT_COLORS.slice(0, 5).map((color) => (
          <button
            key={color}
            onClick={() => onUpdate(index, { ...column, color })}
            className="h-3.5 w-3.5 rounded-full border border-border/40 transition-transform hover:scale-125"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {!editing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setEditing(true)}
                className="h-7 w-7 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ubah nama</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="h-7 w-7 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity"
            >
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pindah ke atas</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMoveDown(index)}
              disabled={index === totalColumns - 1}
              className="h-7 w-7 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity"
            >
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pindah ke bawah</TooltipContent>
        </Tooltip>

        {totalColumns > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onDelete(index)}
                className="h-7 w-7 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hapus kolom</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export default function KanbanTab({ workspace }) {
  const { updateWorkspace } = useWorkspace();
  const [columns, setColumns] = useState(
    [...(workspace.kanbanColumns || [])].sort((a, b) => a.order - b.order),
  );
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const hasChanges =
    JSON.stringify(columns.map((c) => ({ name: c.name, color: c.color }))) !==
    JSON.stringify(
      [...(workspace.kanbanColumns || [])]
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ name: c.name, color: c.color })),
    );

  const handleUpdate = useCallback((index, updated) => {
    setColumns((prev) => prev.map((c, i) => (i === index ? updated : c)));
  }, []);

  const handleAdd = () => {
    setColumns((prev) => [
      ...prev,
      {
        _id: `new-${Date.now()}`,
        name: `Tahap ${prev.length + 1}`,
        color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length],
        order: prev.length,
      },
    ]);
  };

  const handleDelete = (index) => {
    if (columns.length <= 1) {
      toast.error("Harus ada minimal 1 kolom");
      return;
    }
    setDeleteConfirm(index);
  };

  const confirmDelete = () => {
    if (deleteConfirm === null) return;
    setColumns((prev) => prev.filter((_, i) => i !== deleteConfirm));
    setDeleteConfirm(null);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    setColumns((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const handleMoveDown = (index) => {
    if (index === columns.length - 1) return;
    setColumns((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = columns.map((col, index) => ({
        _id: col._id?.startsWith?.("new-") ? undefined : col._id,
        name: col.name,
        color: col.color,
        order: index,
      }));
      await updateWorkspace(workspace._id, { kanbanColumns: updated });
      toast.success("Kolom kanban berhasil disimpan");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal menyimpan kolom kanban",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Columns3 className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Kolom & Tahapan Kanban
                </CardTitle>
                <CardDescription className="text-xs">
                  Atur alur siklus kerja task. Urutan kolom di sini akan mencerminkan papan kanban.
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-2 shrink-0 rounded-xl h-9 text-xs shadow-xs"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4" />
              Tambah Kolom
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {columns.map((column, index) => (
              <ColumnItem
                key={column._id || index}
                column={column}
                index={index}
                totalColumns={columns.length}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-border/60">
            <p className="text-xs text-muted-foreground">
              {columns.length} kolom aktif &bull; Double-klik judul untuk ganti nama langsung
            </p>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="gap-2 rounded-xl h-10 px-5 text-xs shadow-xs"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Simpan Perubahan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete column confirm */}
      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent className="rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Hapus Kolom Kanban
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Yakin ingin menghapus kolom "
              {deleteConfirm !== null && columns[deleteConfirm]?.name}"? Pastikan task pada kolom ini sudah dipindahkan ke kolom lain sebelum dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel className="rounded-xl text-xs">Batal</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="rounded-xl text-xs"
            >
              Hapus Kolom
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
