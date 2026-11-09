"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize,
  Map,
  Download,
  ListTodo,
  BrainCircuit,
  Image,
  FileText,
} from "lucide-react";

const WIDGET_TYPES = [
  {
    type: "task",
    label: "Widget Task",
    icon: ListTodo,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    type: "diagram",
    label: "Widget Diagram",
    icon: BrainCircuit,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    type: "image",
    label: "Widget Gambar",
    icon: Image,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    type: "text",
    label: "Widget Teks",
    icon: FileText,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

export function CanvasToolbar({
  onAddWidget,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleMinimap,
  showMinimap,
  onExport,
  zoom = 1,
}) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-2xl border border-border/80 bg-background/90 px-3 py-1.5 shadow-xl backdrop-blur-md">
      {/* Add Widget */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="h-8 rounded-xl gap-1.5 px-3 text-xs font-semibold shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tambah Widget</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 rounded-xl border-border/80 shadow-lg p-1">
          {WIDGET_TYPES.map(({ type, label, icon: Icon, color, bg }) => (
            <DropdownMenuItem
              key={type}
              onClick={() => onAddWidget(type)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer"
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-md ${bg} ${color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-5 w-px bg-border/70 mx-0.5" />

      {/* Zoom controls */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hover:bg-muted/60"
            onClick={onZoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="rounded-xl border-border/80 text-xs">Zoom Out</TooltipContent>
      </Tooltip>

      <div className="flex h-7 items-center justify-center rounded-lg bg-muted/50 px-2 min-w-11">
        <span className="text-xs font-semibold tabular-nums text-foreground/80">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hover:bg-muted/60"
            onClick={onZoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="rounded-xl border-border/80 text-xs">Zoom In</TooltipContent>
      </Tooltip>

      <div className="h-5 w-px bg-border/70 mx-0.5" />

      {/* Fit to screen */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hover:bg-muted/60"
            onClick={onFitView}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="rounded-xl border-border/80 text-xs">Pas ke Layar</TooltipContent>
      </Tooltip>

      {/* Toggle minimap */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={showMinimap ? "secondary" : "ghost"}
            size="icon"
            className={`h-8 w-8 rounded-xl transition-colors ${
              showMinimap ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-muted/60"
            }`}
            onClick={onToggleMinimap}
          >
            <Map className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="rounded-xl border-border/80 text-xs">
          {showMinimap ? "Sembunyikan" : "Tampilkan"} Minimap
        </TooltipContent>
      </Tooltip>

      <div className="h-5 w-px bg-border/70 mx-0.5" />

      {/* Export */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hover:bg-muted/60"
            onClick={onExport}
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="rounded-xl border-border/80 text-xs">Ekspor Gambar</TooltipContent>
      </Tooltip>
    </div>
  );
}
