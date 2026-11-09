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
  canManage = true,
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
        <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl px-4 py-2.5">
          {/* Selection info */}
          <div className="flex items-center gap-2 pr-3 border-r border-border/80">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold whitespace-nowrap text-foreground">
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
            <SelectTrigger className="h-8.5 w-auto min-w-[130px] text-xs font-semibold gap-1.5 rounded-xl border-border/80 bg-background/80">
              <MoveRight className="h-3.5 w-3.5" />
              <SelectValue placeholder="Pindahkan" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/80 shadow-xl">
              {(columns || []).map((col) => (
                <SelectItem key={col._id} value={col._id} className="text-xs font-semibold">
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

          {/* Change priority, Archive, Delete — Hanya untuk owner, admin, ketua divisi */}
          {canManage && (
            <>
              {/* Change priority */}
              <Select
                onValueChange={(val) =>
                  handleAction(() => onChangePriority(taskIds, val))
                }
                disabled={acting}
              >
                <SelectTrigger className="h-8.5 w-auto min-w-[110px] text-xs font-semibold gap-1.5 rounded-xl border-border/80 bg-background/80">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Prioritas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80 shadow-xl">
                  {[
                    { value: "low", label: "Low", color: "bg-slate-400" },
                    { value: "medium", label: "Medium", color: "bg-amber-400" },
                    { value: "high", label: "High", color: "bg-orange-500" },
                    { value: "critical", label: "Critical", color: "bg-red-500" },
                  ].map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs font-semibold">
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
                className="h-8.5 gap-1.5 text-xs font-semibold rounded-xl border-border/80 bg-background/80 hover:bg-muted/60"
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
                className="h-8.5 gap-1.5 text-xs font-semibold rounded-xl text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={acting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </Button>
            </>
          )}

          {/* Loading spinner */}
          {acting && <Loader2 className="h-4 w-4 animate-spin text-primary ml-1" />}

          {/* Clear selection */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-1 rounded-lg"
            onClick={onClearSelection}
            disabled={acting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Hapus {selectedCount} Task</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Apakah kamu yakin ingin menghapus {selectedCount} task yang dipilih?
              Tindakan ini permanen dan tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="h-9 rounded-xl text-xs font-semibold">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="h-9 rounded-xl text-xs font-semibold bg-destructive hover:bg-destructive/90 text-white"
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