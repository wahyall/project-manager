"use client";

import { useState, useCallback, useRef } from "react";
import { useCalendar } from "@/hooks/use-calendar";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarView } from "@/components/calendar/calendar-view";
import { Card, CardContent } from "@/components/ui/card";
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
        <p className="text-xs text-muted-foreground">
          {calendar.events.length} event dalam tampilan
        </p>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => calendar.refetch()}
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

      <Separator />

      {calendar.error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-10 w-10 text-destructive/60 mb-4" />
            <h3 className="text-sm font-semibold mb-1">Terjadi kesalahan</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {calendar.error}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => calendar.refetch()}
            >
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-6">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
