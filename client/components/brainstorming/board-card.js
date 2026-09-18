"use client";

import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale/id";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

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
    <Card
      className="group overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col"
      onClick={onClick}
    >
      {/* Thumbnail / banner / gradient header */}
      <div className="h-32 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/20 flex items-center justify-center relative overflow-hidden shrink-0">
        {board.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={board.thumbnail}
            alt={board.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Lightbulb className="h-10 w-10 text-amber-400/40" />
        )}

        {/* Mading badge */}
        {board.isMading && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-purple-600/95 hover:bg-purple-600 text-white font-medium text-[10px] gap-1 shadow-sm px-2 py-0.5 border-none">
              <Pin className="h-3 w-3" />
              Mading
            </Badge>
          </div>
        )}

        {/* Actions menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-background/80 dark:bg-neutral-800/80 backdrop-blur-sm shadow-sm hover:bg-background"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) onEdit();
                  else if (onRename) onRename();
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Board
              </DropdownMenuItem>

              {onToggleMading && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMading();
                  }}
                >
                  {board.isMading ? (
                    <>
                      <PinOff className="h-4 w-4 mr-2 text-muted-foreground" />
                      Hapus dari Mading
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4 mr-2 text-purple-500" />
                      Jadikan Mading
                    </>
                  )}
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate?.();
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplikasi
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent className="p-3.5 flex-1 flex flex-col justify-between">
        <h3 className="text-sm font-semibold truncate mb-1.5">{board.name}</h3>
        <div className="flex flex-col text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <LayoutGrid className="h-3 w-3" />
              {board.widgetCount || 0}
            </span>
            {board.createdBy && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {board.createdBy.name?.split(" ")[0]}
              </span>
            )}
          </div>
          <span className="ml-auto mt-2">{timeAgo}</span>
        </div>
      </CardContent>
    </Card>
  );
}
