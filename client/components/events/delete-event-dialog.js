"use client";

import { useState } from "react";
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
import { Loader2, AlertTriangle } from "lucide-react";

export function DeleteEventDialog({ open, onOpenChange, event, onDelete }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete();
    } catch (err) {
      console.error("Failed to delete event:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Hapus Event
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-xs text-muted-foreground leading-relaxed pt-1">
            <span>
              Yakin ingin menghapus event{" "}
              <strong className="text-foreground">
                &ldquo;{event?.title}&rdquo;
              </strong>
              ?
            </span>
            <span className="block text-[11px] text-muted-foreground/80">
              Task yang terhubung tidak akan terhapus, namun relasi ke event ini
              akan dihilangkan. Event dapat dipulihkan dalam waktu 30 hari.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-2">
          <AlertDialogCancel disabled={loading} className="h-9 rounded-xl text-xs font-semibold">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-9 rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Hapus Event
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}