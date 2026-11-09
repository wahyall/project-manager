"use client";

import { useCallback, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
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
    headerClass: "border-blue-500/20",
    iconClass: "bg-blue-500/10 text-blue-500",
    countClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    status: "ongoing",
    label: "Ongoing",
    icon: Play,
    headerClass: "border-emerald-500/20",
    iconClass: "bg-emerald-500/10 text-emerald-500",
    countClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    status: "completed",
    label: "Completed",
    icon: CheckCheck,
    headerClass: "border-border/80",
    iconClass: "bg-muted text-muted-foreground",
    countClass: "bg-muted text-muted-foreground",
  },
];

function getDivisionRef(event) {
  return event.divisionId || null;
}

/**
 * EventKanbanBoard — Board kanban untuk Event, dikelompokkan per status
 * (Upcoming → Ongoing → Completed). Drag antar kolom mengubah status event.
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
              className={cn("rounded-2xl border bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden flex flex-col", col.headerClass)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border/80 bg-muted/20">
                <div
                  className={cn(
                    "h-7 w-7 rounded-xl flex items-center justify-center shrink-0",
                    col.iconClass,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex-1">
                  {col.label}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold h-5 min-w-5 px-2 rounded-full flex items-center justify-center",
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
                      "p-3 space-y-2.5 min-h-[140px] transition-colors",
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
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={cn(
                                "group rounded-xl border border-border/80 bg-background/95 p-3 shadow-2xs transition-all duration-200 cursor-pointer overflow-hidden",
                                "hover:shadow-md hover:border-border hover:-translate-y-0.5",
                                dragSnapshot.isDragging &&
                                  "shadow-xl rotate-[1.5deg] scale-[1.02] ring-2 ring-primary/30 z-50",
                              )}
                              onClick={() => onEventClick?.(event)}
                            >
                              <div
                                className="-mt-3 -mx-3 mb-2.5 h-1"
                                style={{
                                  backgroundColor:
                                    event.color || "#8B5CF6",
                                }}
                              />
                              <div className="space-y-2">
                                <h4 className="font-semibold text-xs leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                                  {event.title}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
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
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                                  {division ? (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] h-5 px-1.5 gap-1 max-w-[140px] font-semibold rounded-md"
                                    >
                                      {division.color && (
                                        <span
                                          className="h-1.5 w-1.5 rounded-full shrink-0"
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
                                    <span className="text-[10px] text-muted-foreground">
                                      Tanpa Divisi
                                    </span>
                                  )}
                                  {(event.taskCount || 0) > 0 && (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground shrink-0">
                                      <ListTodo className="h-3 w-3" />
                                      {event.taskCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground/60 text-center py-8 font-medium">
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