"use client";

import { useState, useCallback, useRef } from "react";
import { useCalendar } from "@/hooks/use-calendar";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarView } from "@/components/calendar/calendar-view";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, RefreshCw } from "lucide-react";

/**
 * EventCalendarView — Kalender khusus Event (terpisah dari kalender Task).
 * Otomatis terfilter sesuai divisi user (via divisionId).
 * Klik event → navigasi ke detail event.
 */
export function EventCalendarView({
  workspaceId,
  workspace,
  divisionId,
  members = [],
  onEventClick,
  onDateClick,
}) {
  const calendar = useCalendar(workspaceId, workspace, {
    fixedType: "events",
    divisionId,
  });

  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [calendarTitle, setCalendarTitle] = useState("");
  const calendarViewRef = useRef(null);

  const handlePrev = useCallback(() => {
    calendarViewRef.current?.prev();
    setCalendarTitle(calendarViewRef.current?.getTitle() || "");
  }, []);

  const handleNext = useCallback(() => {
    calendarViewRef.current?.next();
    setCalendarTitle(calendarViewRef.current?.getTitle() || "");
  }, []);

  const handleToday = useCallback(() => {
    calendarViewRef.current?.today();
    setCalendarTitle(calendarViewRef.current?.getTitle() || "");
  }, []);

  const handleDateRangeChange = useCallback(
    ({ start, end }) => {
      calendar.setDateRange({ start, end });
      setTimeout(() => {
        setCalendarTitle(calendarViewRef.current?.getTitle() || "");
      }, 0);
    },
    [calendar.setDateRange],
  );

  const handleEventClick = useCallback(
    (fcEventId) => {
      if (fcEventId.startsWith("event-")) {
        onEventClick?.(fcEventId.replace("event-", ""));
      }
    },
    [onEventClick],
  );

  // Event tidak bisa di-drag/resize dari kalender
  const noopDrop = useCallback(() => {}, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {calendar.events.length} event dalam kalender
        </p>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl border-border/80"
          onClick={() => calendar.refetch()}
          title="Muat ulang data kalender"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <CalendarToolbar
        title={calendarTitle}
        currentView={currentView}
        onViewChange={setCurrentView}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        filters={calendar.filters}
        onFiltersChange={calendar.setFilters}
        activeFilterCount={calendar.activeFilterCount}
        members={members}
        labels={[]}
        fixedType="events"
        searchPlaceholder="Cari event..."
      />

      <Separator className="opacity-50" />

      {calendar.error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-12 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <h3 className="text-sm font-bold text-foreground mb-1">Terjadi kesalahan</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {calendar.error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calendar.refetch()}
            className="rounded-xl text-xs font-semibold"
          >
            Coba Lagi
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-3 sm:p-5 shadow-xs overflow-hidden">
          <CalendarView
            ref={calendarViewRef}
            events={calendar.calendarEvents}
            currentView={currentView}
            loading={calendar.loading}
            onDateRangeChange={handleDateRangeChange}
            onDateClick={(date) => onDateClick?.(date)}
            onEventClick={handleEventClick}
            onEventDrop={noopDrop}
            onEventResize={noopDrop}
          />
        </div>
      )}
    </div>
  );
}