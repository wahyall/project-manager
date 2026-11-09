"use client";

import { memo, useRef, useEffect, useCallback } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard, isBlocked } from "./task-card";
import { cn } from "@/lib/utils";

function KanbanColumnInner({
  column,
  tasks,
  totalCount,
  hasMore,
  columnLoading,
  doneColumnIds,
  selectedTaskIds,
  onToggleSelect,
  onTaskClick,
  onQuickCreate,
  onLoadMore,
}) {
  const sentinelRef = useRef(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || columnLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !columnLoading) {
          onLoadMore?.(column._id);
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, columnLoading, column._id, onLoadMore]);

  return (
    <div className="flex flex-col min-w-[310px] max-w-[340px] w-[310px] shrink-0 h-full rounded-2xl border border-border/70 bg-muted/20 backdrop-blur-xs shadow-2xs overflow-hidden">
      {/* Column header */}
      <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border/60 bg-card/60 backdrop-blur-xs">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs ring-2 ring-background"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex-1 truncate">
          {column.name}
        </h3>
        <span className="text-2xs font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full min-w-[22px] text-center border border-border/40">
          {totalCount ?? tasks.length}
        </span>
        {onQuickCreate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            onClick={() => onQuickCreate?.(column._id)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Droppable area — scrollable */}
      <Droppable droppableId={column._id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-2.5 transition-colors min-h-[140px] overflow-y-auto max-h-[calc(100vh-270px)] soft-scrollbar",
              snapshot.isDraggingOver && "bg-primary/5 ring-1 ring-inset ring-primary/20",
            )}
          >
            <div className="space-y-2.5">
              {tasks.map((task, index) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  index={index}
                  isSelected={selectedTaskIds.has(task._id)}
                  onToggleSelect={onToggleSelect}
                  onClick={onTaskClick}
                  isDependencyBlocked={isBlocked(task, doneColumnIds)}
                />
              ))}
              {provided.placeholder}
            </div>

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-3">
                {columnLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            )}

            {/* Loading indicator for initial load */}
            {columnLoading && tasks.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}

            {/* Empty state */}
            {tasks.length === 0 &&
              !snapshot.isDraggingOver &&
              !columnLoading && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-xs text-muted-foreground/60 mb-2 font-medium">
                    Belum ada task di tahap ini
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 text-muted-foreground hover:text-foreground h-7 rounded-lg"
                    onClick={() => onQuickCreate?.(column._id)}
                  >
                    <Plus className="h-3 w-3" />
                    Tambah task
                  </Button>
                </div>
              )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export const KanbanColumn = memo(KanbanColumnInner);
