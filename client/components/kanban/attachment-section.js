"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Loader2,
  Download,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Max 1MB
const MAX_SIZE = 1 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(fileType) {
  return fileType?.startsWith("image/");
}

export function AttachmentSection({
  attachments = [],
  workspaceId,
  taskId,
  onUpload,
  onDelete,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Hanya file gambar (JPG, PNG, GIF, WebP) dan PDF yang diperbolehkan");
      return;
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      setError("Ukuran file maksimal 1MB");
      return;
    }

    setUploading(true);
    try {
      await onUpload?.(file);
    } catch (err) {
      setError("Gagal mengupload file");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          Lampiran
        </h4>
        <Badge variant="outline" className="text-[10px]">
          {attachments.length}
        </Badge>
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div
              key={att._id}
              className="group flex items-center gap-3 rounded-lg border p-2.5 hover:bg-accent/30 transition-colors"
            >
              {/* Icon / Thumbnail */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                {isImageFile(att.fileType) ? (
                  <ImageIcon className="h-5 w-5 text-blue-500" />
                ) : (
                  <FileText className="h-5 w-5 text-red-500" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.fileName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatFileSize(att.fileSize)}
                  {att.uploadedAt &&
                    ` · ${format(new Date(att.uploadedAt), "d MMM yyyy", { locale: localeId })}`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete?.(att._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hapus lampiran</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full h-9 gap-2 text-xs border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? "Mengupload..." : "Upload Lampiran"}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          Gambar atau PDF, maks 1MB
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

