"use client";

import { useCallback, useMemo } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { KanbanColumn } from "./kanban-column";
import { Loader2 } from "lucide-react";

export function KanbanBoard({
  columns,
  tasksByColumn,
  columnMeta,
  loading,
  workspace,
  selectedTaskIds,
  onToggleSelect,
  onTaskClick,
  onQuickCreate,
  onLoadMore,
  moveTask,
  reorderInColumn,
}) {
  // Identify "Done" column IDs for dependency blocking
  const doneColumnIds = useMemo(() => {
    if (!workspace?.kanbanColumns) return [];
    return workspace.kanbanColumns
      .filter((col) => col.name.toLowerCase().includes("done"))
      .map((col) => col._id);
  }, [workspace?.kanbanColumns]);

  // Handle drag end
  const onDragEnd = useCallback(
    (result) => {
      const { destination, source, draggableId } = result;

      // Dropped outside a column
      if (!destination) return;

      // Didn't move anywhere
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      const sourceColumnId = source.droppableId;
      const destColumnId = destination.droppableId;
      const taskId = draggableId;

      if (sourceColumnId === destColumnId) {
        // Reorder within the same column
        const columnTasks = [...(tasksByColumn[sourceColumnId] || [])];
        const [removed] = columnTasks.splice(source.index, 1);
        columnTasks.splice(destination.index, 0, removed);
        const reorderedIds = columnTasks.map((t) => t._id);
        reorderInColumn(sourceColumnId, reorderedIds);
      } else {
        // Move to a different column
        const destTasks = tasksByColumn[destColumnId] || [];
        // Calculate new order: insert at destination index
        let newOrder;
        if (destTasks.length === 0) {
          newOrder = 0;
        } else if (destination.index === 0) {
          newOrder = (destTasks[0]?.columnOrder || 0) - 1;
        } else if (destination.index >= destTasks.length) {
          newOrder = (destTasks[destTasks.length - 1]?.columnOrder || 0) + 1;
        } else {
          const prev = destTasks[destination.index - 1]?.columnOrder || 0;
          const next = destTasks[destination.index]?.columnOrder || prev + 2;
          newOrder = (prev + next) / 2;
        }
        moveTask(taskId, destColumnId, newOrder);
      }
    },
    [tasksByColumn, moveTask, reorderInColumn]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 px-1 scrollbar-thin h-full">
        {columns.map((column) => {
          const meta = columnMeta?.[column._id];
          return (
            <KanbanColumn
              key={column._id}
              column={column}
              tasks={tasksByColumn[column._id] || []}
              totalCount={meta?.total}
              hasMore={meta?.hasMore || false}
              columnLoading={meta?.loading || false}
              doneColumnIds={doneColumnIds}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={onToggleSelect}
              onTaskClick={onTaskClick}
              onQuickCreate={onQuickCreate}
              onLoadMore={onLoadMore}
            />
          );
        })}
      </div>
    </DragDropContext>
  );
}
