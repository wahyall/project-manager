"use client";

import { format, isPast, isToday, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
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
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25",
    dot: "bg-blue-500",
  },
  ongoing: {
    label: "Ongoing",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Completed",
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/25",
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
    return { label: "Dimulai hari ini", className: "text-emerald-600 dark:text-emerald-400 font-bold" };
  }
  if (daysUntilStart === 1) {
    return { label: "Mulai besok", className: "text-amber-600 dark:text-amber-400 font-bold" };
  }
  if (daysUntilStart > 1 && daysUntilStart <= 7) {
    return { label: `${daysUntilStart} hari lagi`, className: "text-blue-600 dark:text-blue-400 font-bold" };
  }
  return null;
}

export function EventCard({ event, onClick }) {
  const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.upcoming;
  const dateLabel = getDateLabel(event.startDate, event.endDate);

  return (
    <div
      className="group cursor-pointer rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden flex flex-col justify-between"
      onClick={() => onClick?.(event)}
    >
      <div>
        {/* Accent Bar */}
        <div
          className="h-1.5 w-full transition-all"
          style={{ backgroundColor: event.color || "#8B5CF6" }}
        />

        <div className="p-4 space-y-3">
          {/* Header row: Status badge + date label */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={cn("text-[10px] font-bold h-5 px-2 rounded-md", statusConfig.className)}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", statusConfig.dot)} />
              {statusConfig.label}
            </Badge>
            {dateLabel && (
              <span className={cn("text-[11px]", dateLabel.className)}>
                {dateLabel.label}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          {/* Date range */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>
              {format(new Date(event.startDate), "dd MMM yyyy", {
                locale: localeId,
              })}
            </span>
            <ArrowRight className="h-3 w-3 shrink-0 opacity-60" />
            <span>
              {format(new Date(event.endDate), "dd MMM yyyy", {
                locale: localeId,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: task count + participants */}
      <div className="flex items-center justify-between px-4 pb-4 pt-1 border-t border-border/40 mt-1">
        {/* Task count */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
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
                    <Avatar className="h-6 w-6 border-2 border-card ring-0 shadow-2xs">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                        {p.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs rounded-xl">
                    {p.name}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            {event.participants.length > 4 && (
              <span className="text-[10px] text-muted-foreground font-bold ml-1">
                +{event.participants.length - 4}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60 font-medium">
            <Users className="h-3 w-3" />
            <span>Belum ada peserta</span>
          </div>
        )}
      </div>
    </div>
  );
}