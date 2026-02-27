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
    <div className="flex items-center gap-2 py-2.5 px-3 rounded-lg border bg-card group hover:shadow-sm transition-shadow">
      {/* Drag handle (visual only — we use up/down buttons for reorder) */}
      <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 cursor-grab" />

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
              className="h-6 w-6 rounded-md border border-border/50 shadow-sm transition-transform hover:scale-110"
              style={{ backgroundColor: column.color }}
            />
          </label>
        </TooltipTrigger>
        <TooltipContent>Ubah warna</TooltipContent>
      </Tooltip>

      {/* Name */}
      {editing ? (
        <div className="flex-1 flex items-center gap-1">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
            maxLength={50}
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleSaveName}
            className="text-green-600"
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
            className="text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <span
          className="flex-1 text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
          onDoubleClick={() => setEditing(true)}
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
            className="h-4 w-4 rounded-full border border-border/30 transition-transform hover:scale-125"
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
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rename</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronUp className="h-3.5 w-3.5" />
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
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronDown className="h-3.5 w-3.5" />
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
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
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
        name: `Kolom ${prev.length + 1}`,
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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Columns3 className="h-5 w-5" />
                Kolom Kanban
              </CardTitle>
              <CardDescription>
                Kelola tahapan pengerjaan task. Kolom ini berlaku untuk semua task
                di workspace. Double-klik nama untuk mengedit.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
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

          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {columns.length} kolom &bull; Minimal 1 kolom diperlukan
            </p>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kolom</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus kolom "
              {deleteConfirm !== null && columns[deleteConfirm]?.name}"? Task
              yang ada di kolom ini perlu dipindahkan terlebih dahulu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete}>
              Hapus Kolom
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

