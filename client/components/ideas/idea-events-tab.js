"use client";

import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarRange, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_STATUS_LABEL = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
};

const EVENT_STATUS_CLASS = {
  upcoming: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  ongoing: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  completed: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export function IdeaEventsTab({ events = [], workspaceId }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <CalendarRange className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            Belum ada Event yang mewujudkan ide ini
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Tautkan ide ini lewat field Realisasi dari Ide saat membuat atau
            menyunting Event.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <Link
          key={event._id}
          href={`/workspace/${workspaceId}/events/${event._id}`}
          className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
        >
          <span
            className="h-9 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: event.color || "#8B5CF6" }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {event.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {event.startDate
                ? format(new Date(event.startDate), "dd MMM yyyy", {
                    locale: localeId,
                  })
                : "-"}
              {event.endDate
                ? ` - ${format(new Date(event.endDate), "dd MMM yyyy", {
                    locale: localeId,
                  })}`
                : ""}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              EVENT_STATUS_CLASS[event.status] || EVENT_STATUS_CLASS.upcoming,
            )}
          >
            {EVENT_STATUS_LABEL[event.status] || event.status}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        </Link>
      ))}
    </div>
  );
}
