"use client";

import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Link,
  Loader2,
  ImageIcon,
  X,
  ZoomIn,
  Pencil,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_CAPTION_LENGTH = 500;

// ── Helper: Upload image via ImgBB API ────────────────
async function uploadImage(file) {
  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

  if (apiKey) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result.split(",")[1];
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const formData = new FormData();
    formData.append("key", apiKey);
    formData.append("image", base64);
    formData.append("name", file.name.replace(/\.[^.]+$/, ""));

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("ImgBB upload failed");
    }

    const data = await response.json();
    if (data.success) {
      return data.data.url;
    }
    throw new Error(data.error?.message || "ImgBB upload failed");
  }

  // Fallback: base64 data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Format tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Ukuran file maksimal 1MB.";
  }
  return null;
}

export function ImageWidgetNode({ widgetId, widgetData, onUpdateWidget }) {
  const {
    imageUrl,
    imageSource,
    caption,
    originalFileName,
    objectFit = "contain",
  } = widgetData || {};

  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(caption || "");
  const [showAddDialog, setShowAddDialog] = useState(false);

  // URL embed state
  const [urlInput, setUrlInput] = useState("");
  const [urlPreview, setUrlPreview] = useState(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState(false);

  const fileInputRef = useRef(null);
  const captionInputRef = useRef(null);

  const handleFileSelect = useCallback(
    async (file) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      setUploading(true);
      try {
        const url = await uploadImage(file);
        onUpdateWidget(widgetId, {
          data: {
            ...widgetData,
            imageUrl: url,
            imageSource: "upload",
            originalFileName: file.name,
            title: file.name,
          },
        });
        setShowAddDialog(false);
        toast.success("Gambar berhasil diupload");
      } catch (err) {
        console.error("Upload error:", err);
        toast.error("Gagal mengupload gambar");
      } finally {
        setUploading(false);
      }
    },
    [widgetId, widgetData, onUpdateWidget],
  );

  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      if (e.target) e.target.value = "";
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (file && ALLOWED_TYPES.includes(file.type)) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleUrlPreview = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    setUrlLoading(true);
    setUrlError(false);
    setUrlPreview(url);
  }, [urlInput]);

  const handleUrlConfirm = useCallback(() => {
    if (!urlPreview) return;
    onUpdateWidget(widgetId, {
      data: {
        ...widgetData,
        imageUrl: urlPreview,
        imageSource: "url",
        originalFileName: null,
        title: "Gambar",
      },
    });
    setShowAddDialog(false);
    setUrlInput("");
    setUrlPreview(null);
    toast.success("Gambar dari URL berhasil ditambahkan");
  }, [widgetId, widgetData, onUpdateWidget, urlPreview]);

  const handleSaveCaption = useCallback(() => {
    const trimmed = captionText.trim().slice(0, MAX_CAPTION_LENGTH);
    onUpdateWidget(widgetId, {
      data: { ...widgetData, caption: trimmed || null },
    });
    setCaptionText(trimmed);
    setEditingCaption(false);
  }, [widgetId, widgetData, onUpdateWidget, captionText]);

  // Empty state (no image)
  if (!imageUrl) {
    return (
      <>
        <div
          className="flex flex-col items-center justify-center p-6 h-full min-h-[160px] text-center nodrag nowheel rounded-b-2xl bg-card/40"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <ImageIcon className="h-6 w-6" />
            </div>
            <p className="text-xs text-muted-foreground">
              Seret gambar ke sini atau
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 rounded-xl border-border/80 bg-background/80 shadow-2xs gap-1.5"
              onClick={() => setShowAddDialog(true)}
            >
              <Upload className="h-3.5 w-3.5 text-emerald-500" />
              Pilih Gambar
            </Button>
          </div>
        </div>

        <AddImageDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          uploading={uploading}
          onFileSelect={handleFileSelect}
          fileInputRef={fileInputRef}
          handleFileInput={handleFileInput}
          urlInput={urlInput}
          setUrlInput={setUrlInput}
          urlPreview={urlPreview}
          setUrlPreview={setUrlPreview}
          urlLoading={urlLoading}
          setUrlLoading={setUrlLoading}
          urlError={urlError}
          setUrlError={setUrlError}
          onUrlPreview={handleUrlPreview}
          onUrlConfirm={handleUrlConfirm}
        />
      </>
    );
  }

  // Image present
  return (
    <>
      <div
        className="flex flex-col h-full bg-card/40 rounded-b-2xl overflow-hidden nodrag nowheel"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Image container */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden bg-background/30 relative group/img cursor-pointer min-h-[90px]"
          onClick={() => setPreviewOpen(true)}
        >
          <img
            src={imageUrl}
            alt={widgetData?.title || "Gambar"}
            className="w-full h-full transition-transform duration-200"
            style={{ objectFit: objectFit || "contain" }}
            draggable={false}
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none backdrop-blur-xs">
            <div className="bg-background/90 text-foreground rounded-xl p-2 shadow-md">
              <ZoomIn className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Caption */}
        <div className="px-3 py-2 border-t border-border/50 bg-background/60 min-h-[34px]">
          {editingCaption ? (
            <div className="flex items-center gap-1.5">
              <Input
                ref={captionInputRef}
                value={captionText}
                onChange={(e) =>
                  setCaptionText(e.target.value.slice(0, MAX_CAPTION_LENGTH))
                }
                placeholder="Tulis caption gambar..."
                className="text-xs h-7.5 rounded-lg border-border/80 flex-1"
                maxLength={MAX_CAPTION_LENGTH}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCaption();
                  if (e.key === "Escape") {
                    setCaptionText(caption || "");
                    setEditingCaption(false);
                  }
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg text-emerald-500 shrink-0"
                onClick={handleSaveCaption}
              >
                <span className="text-xs font-semibold">OK</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg shrink-0"
                onClick={() => {
                  setCaptionText(caption || "");
                  setEditingCaption(false);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 cursor-pointer group/caption hover:bg-muted/40 rounded-lg px-2 py-1 -mx-1 transition-colors"
              onClick={() => {
                setCaptionText(caption || "");
                setEditingCaption(true);
              }}
            >
              {caption ? (
                <p className="text-xs font-medium text-foreground/90 line-clamp-2 flex-1">
                  {caption}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground/60 italic flex-1">
                  Klik untuk menambahkan caption...
                </p>
              )}
              <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover/caption:text-muted-foreground transition-colors shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Full-size preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0 overflow-hidden bg-black/80 border-none backdrop-blur-md">
          <DialogTitle className="sr-only">Preview Gambar</DialogTitle>
          <div className="flex items-center justify-center w-full h-full p-4">
            <img
              src={imageUrl}
              alt={widgetData?.title || "Gambar"}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              draggable={false}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Replace image dialog */}
      <AddImageDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        uploading={uploading}
        onFileSelect={handleFileSelect}
        fileInputRef={fileInputRef}
        handleFileInput={handleFileInput}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        urlPreview={urlPreview}
        setUrlPreview={setUrlPreview}
        urlLoading={urlLoading}
        setUrlLoading={setUrlLoading}
        urlError={urlError}
        setUrlError={setUrlError}
        onUrlPreview={handleUrlPreview}
        onUrlConfirm={handleUrlConfirm}
      />
    </>
  );
}

function AddImageDialog({
  open,
  onOpenChange,
  uploading,
  onFileSelect,
  fileInputRef,
  handleFileInput,
  urlInput,
  setUrlInput,
  urlPreview,
  setUrlPreview,
  urlLoading,
  setUrlLoading,
  urlError,
  setUrlError,
  onUrlPreview,
  onUrlConfirm,
}) {
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogTitle className="text-base font-bold text-foreground">
          Tambah Gambar ke Board
        </DialogTitle>

        <Tabs defaultValue="upload" className="mt-2">
          <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 bg-muted/60">
            <TabsTrigger value="upload" className="text-xs rounded-lg gap-1.5 font-medium">
              <Upload className="h-3.5 w-3.5" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs rounded-lg gap-1.5 font-medium">
              <Link className="h-3.5 w-3.5" />
              Dari URL Web
            </TabsTrigger>
          </TabsList>

          {/* Upload tab */}
          <TabsContent value="upload" className="mt-4">
            <div
              className="border border-dashed border-border/80 rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer bg-background/40"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Mengunggah gambar...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Klik atau seret file gambar ke sini
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      JPG, PNG, GIF, WebP · Maksimal 1MB
                    </p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileInput}
            />
          </TabsContent>

          {/* URL tab */}
          <TabsContent value="url" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlError(false);
                  setUrlPreview(null);
                }}
                placeholder="https://example.com/gambar.png"
                className="text-xs h-9.5 rounded-xl border-border/80 bg-background/80 flex-1 shadow-2xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onUrlPreview();
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={onUrlPreview}
                disabled={!urlInput.trim()}
                className="text-xs h-9.5 rounded-xl border-border/80 shadow-2xs shrink-0"
              >
                Pratinjau
              </Button>
            </div>

            {/* URL Preview */}
            {urlPreview && (
              <div className="border border-border/80 rounded-2xl overflow-hidden bg-background/50">
                <div className="bg-muted/20 flex items-center justify-center p-4 min-h-[150px]">
                  {urlLoading && !urlError && (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  )}
                  <img
                    src={urlPreview}
                    alt="Preview"
                    className={`max-w-full max-h-[180px] object-contain rounded-xl ${urlLoading && !urlError ? "hidden" : ""}`}
                    onLoad={() => {
                      setUrlLoading(false);
                      setUrlError(false);
                    }}
                    onError={() => {
                      setUrlLoading(false);
                      setUrlError(true);
                    }}
                    draggable={false}
                  />
                  {urlError && (
                    <div className="flex flex-col items-center gap-1.5 text-destructive">
                      <X className="h-5 w-5" />
                      <p className="text-xs font-medium">
                        Gagal memuat gambar. Periksa kembali tautan URL.
                      </p>
                    </div>
                  )}
                </div>
                {!urlError && !urlLoading && (
                  <div className="p-3 border-t border-border/60 flex justify-end">
                    <Button
                      size="sm"
                      onClick={onUrlConfirm}
                      className="text-xs rounded-xl font-medium shadow-xs"
                    >
                      Gunakan Gambar Ini
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
