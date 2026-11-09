"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ImagePlus, X, Pin, Pencil } from "lucide-react";
import { uploadBannerImage } from "@/lib/image-upload";
import { toast } from "sonner";

export function EditBoardDialog({ open, onOpenChange, board, onSubmit }) {
  const [name, setName] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [isMading, setIsMading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Sync board prop when dialog opens
  useEffect(() => {
    if (board && open) {
      setName(board.name || "");
      setThumbnail(board.thumbnail || null);
      setIsMading(!!board.isMading);
    }
  }, [board, open]);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadBannerImage(file);
      setThumbnail(url);
      toast.success("Banner berhasil diunggah");
    } catch (err) {
      toast.error(err.message || "Gagal mengunggah banner");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || loading || uploadingImage || !board) return;

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        thumbnail,
        isMading,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to update board:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                Edit Informasi Board
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Ubah nama, gambar banner, atau sematkan sebagai papan Mading.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Board Name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-board-name" className="text-xs font-semibold text-foreground">
                Nama Board <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama board..."
                maxLength={100}
                className="h-10 rounded-xl border-border/80 bg-background/80 shadow-2xs text-sm"
                autoFocus
              />
            </div>

            {/* Banner / Thumbnail */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Banner / Thumbnail Board
              </Label>
              {thumbnail ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border/80 shadow-2xs group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnail}
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 rounded-lg text-xs gap-1.5 shadow-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      Ganti
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 rounded-lg text-xs gap-1.5 shadow-xs"
                      onClick={() => setThumbnail(null)}
                      disabled={uploadingImage}
                    >
                      <X className="h-3.5 w-3.5" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 border border-dashed border-border/80 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all bg-background/40"
                >
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span>Mengunggah gambar...</span>
                    </div>
                  ) : (
                    <>
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <ImagePlus className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        Pilih Gambar Banner
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        JPG, PNG, WebP (maks. 2MB)
                      </span>
                    </>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Mading Toggle */}
            <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-3.5 flex items-start gap-3">
              <Checkbox
                id="edit-is-mading"
                checked={isMading}
                onCheckedChange={(checked) => setIsMading(!!checked)}
                className="mt-0.5 border-purple-500/40 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
              <div className="grid gap-1 leading-none cursor-pointer">
                <label
                  htmlFor="edit-is-mading"
                  className="text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer"
                >
                  <Pin className="h-3.5 w-3.5 text-purple-500 fill-current" />
                  Jadikan Papan Mading Workspace
                </label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Board ini akan disematkan dan ditampilkan secara langsung di dashboard workspace sebagai pusat informasi & pengumuman.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || loading || uploadingImage}
              className="rounded-xl font-medium shadow-xs"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
