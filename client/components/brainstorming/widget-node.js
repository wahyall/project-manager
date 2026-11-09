"use client";

import { memo, useState, useRef } from "react";
import { Handle, Position, NodeResizer } from "@xyflow/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowUp,
  ArrowDown,
  ListTodo,
  BrainCircuit,
  Image,
  FileText,
  ImagePlus,
  Download,
} from "lucide-react";
import { TaskWidgetNode } from "./task-widget-node";
import { DiagramWidgetNode } from "./diagram/diagram-widget-node";
import { ImageWidgetNode } from "./image-widget-node";
import { TextWidgetNode } from "./text-widget-node";
import { cn } from "@/lib/utils";

const WIDGET_ICONS = {
  task: {
    icon: ListTodo,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Task",
  },
  mindmap: {
    icon: BrainCircuit,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Diagram",
  },
  diagram: {
    icon: BrainCircuit,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Diagram",
  },
  image: {
    icon: Image,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "Gambar",
  },
  text: {
    icon: FileText,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Teks",
  },
};

const HANDLE_STYLE = {
  width: "0.85rem",
  height: "0.85rem",
};

function WidgetNodeComponent({ id, data, selected }) {
  const {
    type = "text",
    isLocked = false,
    isCollapsed = false,
    widgetData = {},
    onUpdate,
    onDelete,
    onLayerChange,
  } = data;

  const imageReplaceRef = useRef(null);

  const widgetInfo = WIDGET_ICONS[type] || WIDGET_ICONS.text;
  const Icon = widgetInfo.icon;

  const handleToggleCollapse = () => {
    onUpdate?.(id, { isCollapsed: !isCollapsed });
  };

  const handleToggleLock = () => {
    onUpdate?.(id, { isLocked: !isLocked });
  };

  const handleDelete = () => {
    onDelete?.(id);
  };

  const renderContent = () => {
    switch (type) {
      case "task":
        return (
          <TaskWidgetNode
            widgetId={id}
            widgetData={widgetData}
            onUpdateWidget={(wId, data) => onUpdate?.(wId, data)}
          />
        );
      case "mindmap":
      case "diagram":
        return (
          <DiagramWidgetNode
            widgetId={id}
            widgetData={widgetData}
            onUpdateWidget={(wId, data) => onUpdate?.(wId, data)}
          />
        );
      case "image":
        return (
          <ImageWidgetNode
            widgetId={id}
            widgetData={widgetData}
            onUpdateWidget={(wId, data) => onUpdate?.(wId, data)}
          />
        );
      case "text":
        return (
          <TextWidgetNode
            widgetId={id}
            widgetData={widgetData}
            onUpdateWidget={(wId, data) => onUpdate?.(wId, data)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="group relative w-full h-full">
      <NodeResizer
        isVisible={selected && !isLocked}
        minWidth={200}
        minHeight={80}
        onResizeEnd={(e, params) => {
          onUpdate?.(id, {
            width: Math.round(params.width),
            height: Math.round(params.height),
            x: Math.round(params.x),
            y: Math.round(params.y),
          });
        }}
        lineClassName="!border-primary/60"
        handleClassName="!w-3 !h-3 !bg-primary !border-2 !border-background !rounded-full shadow-sm"
      />

      {/* Connection handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="transition-all duration-200 opacity-0 group-hover:opacity-100 hover:!opacity-100 !bg-primary !border-2 !border-background shadow-xs"
        style={HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="transition-all duration-200 opacity-0 group-hover:opacity-100 hover:!opacity-100 !bg-primary !border-2 !border-background shadow-xs"
        style={HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="transition-all duration-200 opacity-0 group-hover:opacity-100 hover:!opacity-100 !bg-primary !border-2 !border-background shadow-xs"
        style={HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="transition-all duration-200 opacity-0 group-hover:opacity-100 hover:!opacity-100 !bg-primary !border-2 !border-background shadow-xs"
        style={HANDLE_STYLE}
      />

      <div
        className={cn(
          "flex flex-col w-full h-full rounded-2xl border bg-card/95 backdrop-blur-md shadow-xs transition-all overflow-hidden",
          selected
            ? "border-primary/50 ring-2 ring-primary/30 shadow-lg"
            : "border-border/80 hover:border-border hover:shadow-md",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 px-3.5 py-2.5 border-b border-border/50 cursor-grab select-none shrink-0",
            widgetInfo.bg,
          )}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-background/80 shadow-2xs">
            <Icon className={cn("h-3.5 w-3.5", widgetInfo.color)} />
          </div>
          <span className="truncate flex-1 text-xs font-semibold text-foreground tracking-tight">
            {widgetData.title || widgetInfo.label}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {isLocked && <Lock className="h-3 w-3 text-muted-foreground/70 mr-0.5" />}

            {/* Collapse toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-lg hover:bg-background/60"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCollapse();
              }}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>

            {/* Context menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-lg hover:bg-background/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/80 shadow-xl p-1">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="rounded-lg text-xs">
                    <ArrowUpToLine className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    Layer Posisi
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="rounded-xl border-border/80 shadow-lg p-1">
                    <DropdownMenuItem
                      className="rounded-lg text-xs"
                      onClick={() => onLayerChange?.(id, "front")}
                    >
                      <ArrowUpToLine className="h-3.5 w-3.5 mr-2" />
                      Paling Depan
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-lg text-xs"
                      onClick={() => onLayerChange?.(id, "back")}
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5 mr-2" />
                      Paling Belakang
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-lg text-xs"
                      onClick={() => onLayerChange?.(id, "forward")}
                    >
                      <ArrowUp className="h-3.5 w-3.5 mr-2" />
                      Maju Selangkah
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-lg text-xs"
                      onClick={() => onLayerChange?.(id, "backward")}
                    >
                      <ArrowDown className="h-3.5 w-3.5 mr-2" />
                      Mundur Selangkah
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={handleToggleLock} className="rounded-lg text-xs">
                  {isLocked ? (
                    <Unlock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  )}
                  {isLocked ? "Buka Kunci Posisi" : "Kunci Posisi"}
                </DropdownMenuItem>

                {/* Image-specific actions */}
                {type === "image" && widgetData?.imageUrl && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="rounded-lg text-xs"
                      onClick={() => imageReplaceRef.current?.click()}
                    >
                      <ImagePlus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      Ganti Gambar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-lg text-xs"
                      onClick={() => {
                        if (widgetData?.imageUrl) {
                          const link = document.createElement("a");
                          link.href = widgetData.imageUrl;
                          link.download =
                            widgetData.originalFileName || "image";
                          link.target = "_blank";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      Unduh Gambar
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-lg text-xs text-destructive focus:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Hapus Widget
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden file input for image replace */}
            {type === "image" && (
              <input
                ref={imageReplaceRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const ALLOWED = [
                      "image/jpeg",
                      "image/png",
                      "image/gif",
                      "image/webp",
                    ];
                    if (!ALLOWED.includes(file.type)) return;
                    if (file.size > 1024 * 1024) return;
                    const doUpload = async () => {
                      try {
                        let url;
                        const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
                        if (apiKey) {
                          const base64 = await new Promise(
                            (resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = (ev) =>
                                resolve(ev.target.result.split(",")[1]);
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            },
                          );
                          const formData = new FormData();
                          formData.append("key", apiKey);
                          formData.append("image", base64);
                          const resp = await fetch(
                            "https://api.imgbb.com/1/upload",
                            { method: "POST", body: formData },
                          );
                          const data = await resp.json();
                          if (data.success) {
                            url = data.data.url;
                          } else {
                            throw new Error("ImgBB upload failed");
                          }
                        } else {
                          url = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => resolve(ev.target.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                          });
                        }
                        onUpdate?.(id, {
                          data: {
                            ...widgetData,
                            imageUrl: url,
                            imageSource: "upload",
                            originalFileName: file.name,
                            title: file.name,
                          },
                        });
                      } catch (err) {
                        console.error("Replace image error:", err);
                      }
                    };
                    doUpload();
                  }
                  if (e.target) e.target.value = "";
                }}
              />
            )}
          </div>
        </div>

        {/* Content (hidden when collapsed) */}
        {!isCollapsed && (
          <div className="flex-1 overflow-auto bg-card/40">
            {renderContent()}
          </div>
        )}
      </div>
    </div>
  );
}

export const WidgetNode = memo(WidgetNodeComponent);
