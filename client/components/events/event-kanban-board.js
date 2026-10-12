"use client";

import { useCallback, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  ListTodo,
  Loader2,
  Clock,
  Play,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLUMNS = [
  {
    status: "upcoming",
    label: "Upcoming",
    icon: Clock,
    headerClass: "bg-blue-500/5 border-blue-500/10",
    iconClass: "bg-blue-500/10 text-blue-500",
    countClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    status: "ongoing",
    label: "Ongoing",
    icon: Play,
    headerClass: "bg-emerald-500/5 border-emerald-500/10",
    iconClass: "bg-emerald-500/10 text-emerald-500",
    countClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    status: "completed",
    label: "Completed",
    icon: CheckCheck,
    headerClass: "bg-gray-500/5 border-gray-500/10",
    iconClass: "bg-gray-500/10 text-gray-400",
    countClass: "bg-gray-500/10 text-gray-500",
  },
];

function getDivisionRef(event) {
  return event.divisionId || null;
}

/**
 * EventKanbanBoard — Board kanban untuk Event, dikelompokkan per status
 * (Upcoming → Ongoing → Completed). Drag antar kolom mengubah status event.
 * Badge divisi menunjukkan Divisi Workspace pemilik tiap event.
 */
export function EventKanbanBoard({
  events = [],
  loading = false,
  getDivision,
  onEventClick,
  onStatusChange,
}) {
  const grouped = useMemo(() => {
    const map = { upcoming: [], ongoing: [], completed: [] };
    for (const e of events) {
      if (map[e.status]) map[e.status].push(e);
      else map.upcoming.push(e);
    }
    return map;
  }, [events]);

  const onDragEnd = useCallback(
    (result) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }
      if (destination.droppableId !== source.droppableId) {
        onStatusChange?.(draggableId, destination.droppableId);
      }
    },
    [onStatusChange],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {STATUS_COLUMNS.map((col) => {
          const items = grouped[col.status] || [];
          const Icon = col.icon;
          return (
            <div
              key={col.status}
              className={cn("rounded-xl border", col.headerClass)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center",
                    col.iconClass,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold flex-1">
                  {col.label}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-bold h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center",
                    col.countClass,
                  )}
                >
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <Droppable droppableId={col.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "px-2.5 pb-2.5 space-y-2 min-h-[120px] rounded-b-xl transition-colors",
                      snapshot.isDraggingOver && "bg-primary/5",
                    )}
                  >
                    {items.map((event, index) => {
                      const divRef = getDivisionRef(event);
                      const division =
                        getDivision?.(divRef) ||
                        (divRef && typeof divRef === "object"
                          ? divRef
                          : null);
                      return (
                        <Draggable
                          key={event._id}
                          draggableId={event._id}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <Card
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={cn(
                                "cursor-pointer transition-shadow hover:shadow-md",
                                dragSnapshot.isDragging &&
                                  "shadow-lg ring-1 ring-primary/30",
                              )}
                              onClick={() => onEventClick?.(event)}
                            >
                              <CardContent className="p-0">
                                <div
                                  className="h-1 rounded-t-lg"
                                  style={{
                                    backgroundColor:
                                      event.color || "#8B5CF6",
                                  }}
                                />
                                <div className="p-3 space-y-2">
                                  <h4 className="font-medium text-[13px] leading-snug line-clamp-2">
                                    {event.title}
                                  </h4>
                                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <CalendarDays className="h-3 w-3 shrink-0" />
                                    <span>
                                      {format(
                                        new Date(event.startDate),
                                        "dd MMM yyyy",
                                        { locale: localeId },
                                      )}
                                    </span>
                                    <span>→</span>
                                    <span>
                                      {format(
                                        new Date(event.endDate),
                                        "dd MMM yyyy",
                                        { locale: localeId },
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    {division ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] h-5 px-1.5 gap-1 max-w-[140px]"
                                      >
                                        {division.color && (
                                          <span
                                            className="h-2 w-2 rounded-full shrink-0"
                                            style={{
                                              backgroundColor:
                                                division.color,
                                            }}
                                          />
                                        )}
                                        <span className="truncate">
                                          {division.name}
                                        </span>
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5 px-1.5 text-muted-foreground"
                                      >
                                        Tanpa Divisi
                                      </Badge>
                                    )}
                                    {(event.taskCount || 0) > 0 && (
                                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                                        <ListTodo className="h-3 w-3" />
                                        {event.taskCount}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {items.length === 0 && (
                      <p className="text-[11px] text-muted-foreground/60 text-center py-6">
                        Seret event ke sini
                      </p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
