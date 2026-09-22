"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlignLeft, Loader2, Sprout } from "lucide-react";

// BlockNote di-lazy-load untuk menghindari masalah SSR, sama seperti
// yang dilakukan create-event-dialog.
const BlockNoteEditor = lazy(() =>
  import("@/components/blocknote-editor").then((m) => ({
    default: m.BlockNoteEditor,
  })),
);

export function CreateIdeaDialog({ open, onOpenChange, onCreate }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [editorKey, setEditorKey] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setErrors({});
      setEditorKey((k) => k + 1);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrors({ title: "Judul ide harus diisi" });
      return;
    }
    if (title.trim().length > 120) {
      setErrors({ title: "Judul maksimal 120 karakter" });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await onCreate({ title: title.trim(), description });
      onOpenChange(false);
    } catch (err) {
      setErrors({
        submit: err.response?.data?.message || "Gagal menyimpan ide",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sprout className="h-5 w-5 text-amber-500" />
            Tulis Ide
          </DialogTitle>
          <DialogDescription>
            Cukup judul dan sedikit penjelasan. Sisanya bisa dilengkapi nanti.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="idea-title">
              Judul Ide <span className="text-destructive">*</span>
            </Label>
            <Input
              id="idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Festival literasi kampus"
              maxLength={120}
              className={errors.title ? "border-destructive" : ""}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <AlignLeft className="h-3 w-3" />
              Penjelasan
            </Label>
            <div className="rounded-md border border-input px-6 py-2">
              {open && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  }
                >
                  <BlockNoteEditor
                    key={editorKey}
                    initialContent={null}
                    onChange={setDescription}
                    placeholder="Kenapa ide ini layak dikerjakan?"
                    className="blocknote-compact"
                  />
                </Suspense>
              )}
            </div>
          </div>

          {errors.submit && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.submit}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Ide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
