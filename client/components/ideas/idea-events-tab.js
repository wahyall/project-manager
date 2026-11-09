"use client";

import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar, CalendarRange, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_STATUS_LABEL = {
  upcoming: "Akan Datang",
  ongoing: "Sedang Berjalan",
  completed: "Selesai",
};

const EVENT_STATUS_CLASS = {
  upcoming: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  ongoing: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  completed: "bg-muted text-muted-foreground border-border/80",
};

export function IdeaEventsTab({ events = [], workspaceId }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 py-16 px-6 text-center shadow-2xs backdrop-blur-xs">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <CalendarRange className="h-7 w-7" />
        </div>
        <h3 className="mb-1.5 text-base font-semibold text-foreground tracking-tight">
          Belum ada Event yang mewujudkan ide ini
        </h3>
        <p className="max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Tautkan ide ini lewat field <span className="font-medium text-foreground">Realisasi dari Ide</span> saat membuat atau
          menyunting agenda Event untuk melacak pelaksanaannya.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {events.length} Event Terhubung
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {events.map((event) => (
          <Link
            key={event._id}
            href={`/workspace/${workspaceId}/events/${event._id}`}
            className="group flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-2xs backdrop-blur-xs transition-all hover:border-primary/40 hover:bg-card/90 hover:shadow-xs hover:-translate-y-0.5"
          >
            <span
              className="h-10 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: event.color || "#8B5CF6" }}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {event.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span>
                  {event.startDate
                    ? format(new Date(event.startDate), "dd MMM yyyy", {
                        locale: localeId,
                      })
                    : "-"}
                  {event.endDate
                    ? ` — ${format(new Date(event.endDate), "dd MMM yyyy", {
                        locale: localeId,
                      })}`
                    : ""}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  EVENT_STATUS_CLASS[event.status] || EVENT_STATUS_CLASS.upcoming,
                )}
              >
                {EVENT_STATUS_LABEL[event.status] || event.status}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
