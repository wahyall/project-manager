"use client";

import { useState, useEffect } from "react";
import { DiagramFullscreenModal } from "./diagram-fullscreen-modal";
import { Maximize2, PenTool, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

if (typeof window !== "undefined" && !window.EXCALIDRAW_ASSET_PATH) {
  window.EXCALIDRAW_ASSET_PATH = "/";
}

export function DiagramWidgetNode({ widgetId, widgetData, onUpdateWidget }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [svgContent, setSvgContent] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const { resolvedTheme } = useTheme();

  const elements = widgetData?.elements;
  const hasElements = Array.isArray(elements) && elements.length > 0;

  useEffect(() => {
    let isCancelled = false;

    if (!hasElements) {
      setSvgContent("");
      return;
    }

    async function generateSvgPreview() {
      setIsRendering(true);
      try {
        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const svg = await exportToSvg({
          elements: elements,
          appState: {
            exportWithDarkMode: resolvedTheme === "dark",
            exportBackground: false,
            ...(widgetData?.appState || {}),
          },
          files: widgetData?.files || {},
        });

        if (!isCancelled) {
          svg.setAttribute("width", "100%");
          svg.setAttribute("height", "100%");
          svg.style.width = "100%";
          svg.style.height = "100%";
          svg.style.objectFit = "contain";
          setSvgContent(svg.outerHTML);
        }
      } catch (err) {
        console.error("Failed to generate Excalidraw SVG preview:", err);
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    generateSvgPreview();

    return () => {
      isCancelled = true;
    };
  }, [
    elements,
    widgetData?.appState,
    widgetData?.files,
    resolvedTheme,
    hasElements,
  ]);

  return (
    <>
      <div
        className="w-full h-full relative overflow-hidden bg-background/50 group nodrag nowheel flex items-center justify-center select-none"
        onDoubleClick={() => setIsFullscreen(true)}
      >
        {hasElements && svgContent ? (
          <div
            className="w-full h-full p-2 flex items-center justify-center overflow-hidden pointer-events-none"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : isRendering ? (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs">Memuat pratinjau...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-2 text-purple-500">
              <PenTool className="h-6 w-6" />
            </div>
            <p className="text-xs font-medium text-foreground">
              Whiteboard Diagram
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[180px]">
              Klik untuk mulai membuat sketsa & diagram Excalidraw
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 text-xs h-7 gap-1.5 border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10"
              onClick={() => setIsFullscreen(true)}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              Mulai Menggambar
            </Button>
          </div>
        )}

        {/* Hover overlay with Edit button when elements exist */}
        {hasElements && (
          <div className="absolute inset-0 z-10 bg-background/0 group-hover:bg-background/40 transition-colors flex items-center justify-center pointer-events-none">
            <Button
              className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto shadow-lg h-8 text-xs gap-1.5"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Edit Diagram
            </Button>
          </div>
        )}
      </div>

      <DiagramFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        widgetId={widgetId}
        widgetData={widgetData}
        onUpdateWidget={onUpdateWidget}
      />
    </>
  );
}
