"use client";

import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

// Dynamically import ExcalidrawEditor with SSR disabled
const ExcalidrawEditor = dynamic(
  () => import("./excalidraw-editor").then((mod) => mod.ExcalidrawEditor),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-background text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <span className="text-xs font-semibold text-foreground/80">Memuat Editor Excalidraw...</span>
      </div>
    ),
  },
);

export function DiagramFullscreenModal({
  isOpen,
  onClose,
  widgetId,
  widgetData,
  onUpdateWidget,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[96vw] w-[96vw] h-[94vh] flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-card/95 backdrop-blur-md"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Editor Diagram Excalidraw</DialogTitle>
          <DialogDescription>
            Whiteboard dan diagram interaktif dengan Excalidraw
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 w-full h-full relative overflow-hidden bg-background">
          {isOpen && (
            <ExcalidrawEditor
              widgetId={widgetId}
              initialData={widgetData}
              onUpdateWidget={onUpdateWidget}
              onClose={onClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
