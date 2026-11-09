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
import { AlertTriangle, Loader2 } from "lucide-react";

export function DeleteIdeaDialog({
  open,
  onOpenChange,
  ideaTitle,
  onConfirm,
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl max-w-md p-6">
        <AlertDialogHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Hapus ide ini?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Ide <span className="font-semibold text-foreground">&ldquo;{ideaTitle}&rdquo;</span> akan
              dihapus dari Bank Ide beserta seluruh diskusinya. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading} className="rounded-xl">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-2xs font-medium"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Hapus Ide
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
