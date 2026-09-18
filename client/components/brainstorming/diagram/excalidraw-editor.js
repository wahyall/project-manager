"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useTheme } from "next-themes";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

if (typeof window !== "undefined" && !window.EXCALIDRAW_ASSET_PATH) {
  window.EXCALIDRAW_ASSET_PATH = "/";
}

export function ExcalidrawEditor({
  widgetId,
  initialData,
  onUpdateWidget,
  onClose,
}) {
  const { resolvedTheme } = useTheme();
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const saveTimeoutRef = useRef(null);
  const latestDataRef = useRef(null);

  // Prepare initial data
  const initialScene = useRef({
    elements: Array.isArray(initialData?.elements) ? initialData.elements : [],
    appState: {
      theme: resolvedTheme === "dark" ? "dark" : "light",
      ...(initialData?.appState || {}),
    },
    files: initialData?.files || {},
    scrollToContent: true,
  });

  // Handle scene change with debounce
  const handleChange = useCallback(
    (elements, appState, files) => {
      // Keep latest reference for unmount flush
      latestDataRef.current = { elements, appState, files };

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (!onUpdateWidget) return;

        // Strip non-serializable or transient appState keys
        const cleanAppState = {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        };

        onUpdateWidget(widgetId, {
          data: {
            title: initialData?.title || "Diagram",
            elements: Array.from(elements),
            appState: cleanAppState,
            files: files || {},
          },
        });
      }, 800);
    },
    [widgetId, initialData?.title, onUpdateWidget],
  );

  // Flush pending changes on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (latestDataRef.current && onUpdateWidget) {
        const { elements, appState, files } = latestDataRef.current;
        onUpdateWidget(widgetId, {
          data: {
            title: initialData?.title || "Diagram",
            elements: Array.from(elements),
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              gridSize: appState.gridSize,
            },
            files: files || {},
          },
        });
      }
    };
  }, [widgetId, initialData?.title, onUpdateWidget]);

  // Sync theme when theme changes
  useEffect(() => {
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({
        appState: {
          theme: resolvedTheme === "dark" ? "dark" : "light",
        },
      });
    }
  }, [resolvedTheme, excalidrawAPI]);

  return (
    <div className="w-full h-full relative flex flex-col">
      <div className="flex-1 w-full h-full">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={initialScene.current}
          onChange={handleChange}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          renderTopRightUI={() =>
            onClose ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-[36px] px-3 gap-1.5 bg-background border shadow-xs hover:bg-accent text-xs font-medium cursor-pointer rounded-lg shrink-0"
              >
                <X className="h-4 w-4" />
                <span>Tutup</span>
              </Button>
            ) : null
          }
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              loadScene: true,
              saveToActiveFile: false,
              toggleTheme: true,
              saveAsImage: true,
            },
          }}
        />
      </div>
    </div>
  );
}
