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
import { AlignLeft, Lightbulb, Loader2, Sprout } from "lucide-react";

const MentionEditor = lazy(() =>
  import("@/components/mention-editor").then((m) => ({
    default: m.MentionEditor,
  })),
);

export function CreateIdeaDialog({ open, onOpenChange, onCreate, workspaceId }) {
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px] rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shadow-2xs">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Tulis Ide Baru
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Cukup judul dan penjelasan ringkas. Ide bisa diperkaya bersama tim nanti.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="idea-title" className="text-xs font-semibold text-foreground">
              Judul Ide <span className="text-destructive">*</span>
            </Label>
            <Input
              id="idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Kajian Tematik Pemuda Hijrah Surabaya"
              maxLength={120}
              className={`h-10 rounded-xl border-border/80 bg-background/80 shadow-2xs text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/20 ${
                errors.title ? "border-destructive focus-visible:ring-destructive/20" : ""
              }`}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-destructive font-medium">{errors.title}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
              Penjelasan / Latar Belakang
            </Label>
            <div className="rounded-xl border border-border/80 bg-background/80 p-3 shadow-2xs transition-shadow focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
              {open && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  }
                >
                  <MentionEditor
                    key={editorKey}
                    workspaceId={workspaceId}
                    initialContent={null}
                    onChange={setDescription}
                    placeholder="Kenapa ide ini layak diwujudkan? Ketik @ untuk mention anggota..."
                    className="blocknote-compact min-h-[120px]"
                  />
                </Suspense>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              {errors.submit}
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border/60 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl shadow-xs gap-2 font-medium"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sprout className="h-4 w-4" />
            )}
            Simpan Ide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
