"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useTheme } from "next-themes";
import { Check, Loader2 } from "lucide-react";

if (typeof window !== "undefined" && !window.EXCALIDRAW_ASSET_PATH) {
  window.EXCALIDRAW_ASSET_PATH = "/";
}

export function ExcalidrawEditor({
  widgetId,
  initialData,
  onUpdateWidget,
}) {
  const { resolvedTheme } = useTheme();
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved"); // "saving" | "saved"
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
      setSaveStatus("saving");

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
        setSaveStatus("saved");
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
      {/* Save indicator badge */}
      <div className="absolute top-3 right-16 z-50 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-background/80 backdrop-blur-sm border shadow-sm text-muted-foreground">
          {saveStatus === "saving" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span>Tersimpan</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 w-full h-full">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={initialScene.current}
          onChange={handleChange}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
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
