"use client";

import { useState } from "react";
import {
  X,
  MoveRight,
  UserPlus,
  AlertTriangle,
  Archive,
  Trash2,
  Loader2,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function BulkActionBar({
  selectedCount,
  selectedTaskIds,
  columns,
  onMoveToColumn,
  onChangePriority,
  onArchive,
  onDelete,
  onClearSelection,
}) {
  const [acting, setActing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (selectedCount === 0) return null;

  const taskIds = Array.from(selectedTaskIds);

  const handleAction = async (fn) => {
    setActing(true);
    try {
      await fn();
    } catch (err) {
      console.error("Bulk action failed:", err);
    } finally {
      setActing(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="flex items-center gap-2 bg-card border shadow-xl rounded-xl px-4 py-2.5">
          {/* Selection info */}
          <div className="flex items-center gap-2 pr-3 border-r">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium whitespace-nowrap">
              {selectedCount} task dipilih
            </span>
          </div>

          {/* Move to column */}
          <Select
            onValueChange={(colId) =>
              handleAction(() => onMoveToColumn(taskIds, colId))
            }
            disabled={acting}
          >
            <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs gap-1.5 border-dashed">
              <MoveRight className="h-3.5 w-3.5" />
              <SelectValue placeholder="Pindahkan" />
            </SelectTrigger>
            <SelectContent>
              {(columns || []).map((col) => (
                <SelectItem key={col._id} value={col._id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    {col.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Change priority */}
          <Select
            onValueChange={(val) =>
              handleAction(() => onChangePriority(taskIds, val))
            }
            disabled={acting}
          >
            <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs gap-1.5 border-dashed">
              <AlertTriangle className="h-3.5 w-3.5" />
              <SelectValue placeholder="Prioritas" />
            </SelectTrigger>
            <SelectContent>
              {[
                { value: "low", label: "Low", color: "bg-slate-400" },
                { value: "medium", label: "Medium", color: "bg-amber-400" },
                { value: "high", label: "High", color: "bg-orange-500" },
                { value: "critical", label: "Critical", color: "bg-red-500" },
              ].map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", p.color)} />
                    {p.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Archive */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => handleAction(() => onArchive(taskIds))}
            disabled={acting}
          >
            <Archive className="h-3.5 w-3.5" />
            Arsipkan
          </Button>

          {/* Delete */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={acting}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus
          </Button>

          {/* Loading spinner */}
          {acting && <Loader2 className="h-4 w-4 animate-spin text-primary ml-1" />}

          {/* Clear selection */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-1"
            onClick={onClearSelection}
            disabled={acting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedCount} Task</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus {selectedCount} task yang dipilih?
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                handleAction(() => onDelete(taskIds));
                setDeleteDialogOpen(false);
              }}
            >
              Hapus Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

