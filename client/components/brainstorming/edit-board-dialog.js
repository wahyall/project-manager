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
import { Loader2, ImagePlus, X, Pin } from "lucide-react";
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Informasi Board</DialogTitle>
          <DialogDescription>
            Ubah nama, banner / thumbnail, atau status Mading untuk board ini.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-3">
            {/* Board Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-board-name">Nama Board</Label>
              <Input
                id="edit-board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama board..."
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Banner / Thumbnail */}
            <div className="space-y-2">
              <Label>Banner / Thumbnail Board</Label>
              {thumbnail ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border shadow-sm group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnail}
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
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
                      className="h-8 text-xs gap-1.5"
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
                  className="w-full h-28 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span>Mengunggah gambar...</span>
                    </div>
                  ) : (
                    <>
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <ImagePlus className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        Unggah Gambar Banner
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
            <div className="flex items-start space-x-3 pt-2 border-t">
              <Checkbox
                id="edit-is-mading"
                checked={isMading}
                onCheckedChange={(checked) => setIsMading(!!checked)}
                className="mt-0.5"
              />
              <div className="grid gap-1 leading-none cursor-pointer">
                <label
                  htmlFor="edit-is-mading"
                  className="text-sm font-medium text-foreground flex items-center gap-1.5 cursor-pointer"
                >
                  <Pin className="h-3.5 w-3.5 text-purple-500" />
                  Tandai sebagai Mading Workspace
                </label>
                <p className="text-xs text-muted-foreground">
                  Board ini akan ditampilkan secara penuh di dashboard utama workspace sebagai papan pengumuman & informasi.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || loading || uploadingImage}
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
