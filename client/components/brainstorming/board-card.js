"use client";

import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale/id";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  LayoutGrid,
  User,
  Pin,
  PinOff,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BoardCard({
  board,
  onClick,
  onEdit,
  onRename,
  onToggleMading,
  onDuplicate,
  onDelete,
}) {
  const timeAgo = board.updatedAt
    ? formatDistanceToNow(new Date(board.updatedAt), {
        addSuffix: true,
        locale: localeId,
      })
    : "";

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="group relative flex flex-col rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:bg-card/90 hover:shadow-md cursor-pointer overflow-hidden text-left"
      onClick={onClick}
    >
      {/* Thumbnail / banner / gradient header */}
      <div className="relative h-34 w-full shrink-0 overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/20 flex items-center justify-center">
        {board.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={board.thumbnail}
            alt={board.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500/80 shadow-2xs">
            <Lightbulb className="h-6 w-6" />
          </div>
        )}

        {/* Subtle bottom shadow overlay on thumbnail */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />

        {/* Mading badge */}
        {board.isMading && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/90 text-white font-medium text-[11px] px-2.5 py-0.5 shadow-xs backdrop-blur-xs">
              <Pin className="h-3 w-3 fill-current" />
              Mading
            </span>
          </div>
        )}

        {/* Actions menu */}
        <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg bg-background/80 backdrop-blur-md shadow-2xs hover:bg-background border border-border/60"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-border/80 shadow-lg">
              <DropdownMenuItem
                className="rounded-lg text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) onEdit();
                  else if (onRename) onRename();
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Edit Board
              </DropdownMenuItem>

              {onToggleMading && (
                <DropdownMenuItem
                  className="rounded-lg text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMading();
                  }}
                >
                  {board.isMading ? (
                    <>
                      <PinOff className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      Hapus dari Mading
                    </>
                  ) : (
                    <>
                      <Pin className="h-3.5 w-3.5 mr-2 text-purple-500" />
                      Jadikan Mading
                    </>
                  )}
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                className="rounded-lg text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate?.();
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Duplikasi
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-lg text-xs text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Board Body */}
      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
        <div>
          <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {board.name}
          </h3>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1 font-medium">
              <LayoutGrid className="h-3.5 w-3.5 text-primary/70" />
              <span>{board.widgetCount || 0} widget</span>
            </span>
            {board.createdBy && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="truncate max-w-[80px]">
                  {board.createdBy.name?.split(" ")[0]}
                </span>
              </span>
            )}
          </div>
          {timeAgo && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
              <Clock className="h-3 w-3 opacity-60" />
              {timeAgo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
