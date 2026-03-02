"use client";

import { format, isPast, isToday, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarDays,
  ListTodo,
  Users,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  upcoming: {
    label: "Upcoming",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  ongoing: {
    label: "Ongoing",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Completed",
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    dot: "bg-gray-400",
  },
};

function getDateLabel(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  const daysUntilStart = differenceInDays(start, now);

  if (isPast(end) && !isToday(end)) {
    return { label: "Selesai", className: "text-muted-foreground" };
  }
  if (isToday(start)) {
    return { label: "Dimulai hari ini", className: "text-emerald-600 dark:text-emerald-400" };
  }
  if (daysUntilStart === 1) {
    return { label: "Mulai besok", className: "text-amber-600 dark:text-amber-400" };
  }
  if (daysUntilStart > 1 && daysUntilStart <= 7) {
    return { label: `${daysUntilStart} hari lagi`, className: "text-blue-600 dark:text-blue-400" };
  }
  return null;
}

export function EventCard({ event, onClick }) {
  const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.upcoming;
  const dateLabel = getDateLabel(event.startDate, event.endDate);

  return (
    <Card
      className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 active:translate-y-0"
      onClick={() => onClick?.(event)}
    >
      <CardContent className="p-0">
        {/* Color bar at top */}
        <div
          className="h-1 rounded-t-lg"
          style={{ backgroundColor: event.color || "#8B5CF6" }}
        />

        <div className="p-4 space-y-3">
          {/* Header row: Status badge + date label */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={cn("text-[10px] font-medium h-5 px-2", statusConfig.className)}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", statusConfig.dot)} />
              {statusConfig.label}
            </Badge>
            {dateLabel && (
              <span className={cn("text-[11px] font-medium", dateLabel.className)}>
                {dateLabel.label}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          {/* Date range */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>
              {format(new Date(event.startDate), "dd MMM yyyy", {
                locale: localeId,
              })}
            </span>
            <ArrowRight className="h-3 w-3 shrink-0" />
            <span>
              {format(new Date(event.endDate), "dd MMM yyyy", {
                locale: localeId,
              })}
            </span>
          </div>

          {/* Footer: task count + participants */}
          <div className="flex items-center justify-between pt-1">
            {/* Task count */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ListTodo className="h-3.5 w-3.5" />
              <span>{event.taskCount || 0} task</span>
            </div>

            {/* Participants */}
            {event.participants?.length > 0 ? (
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1.5">
                  {event.participants.slice(0, 4).map((p) => (
                    <Tooltip key={p._id}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                            {p.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {p.name}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                {event.participants.length > 4 && (
                  <span className="text-[10px] text-muted-foreground font-medium ml-1">
                    +{event.participants.length - 4}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                <Users className="h-3.5 w-3.5" />
                <span>Belum ada peserta</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

