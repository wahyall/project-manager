"use client";

import {
  useRef,
  useCallback,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarEventContent } from "./calendar-event-content";
import { cn } from "@/lib/utils";

/**
 * CalendarView — FullCalendar wrapper with custom styling.
 *
 * Exposes navigation methods via ref: prev(), next(), today(), getTitle().
 * Handles: view rendering, date nav, drag-to-reschedule, resize, clicks.
 */
export const CalendarView = forwardRef(function CalendarView(
  {
    events,
    currentView,
    onDateRangeChange,
    onDateClick,
    onEventClick,
    onEventDrop,
    onEventResize,
    loading,
  },
  ref
) {
  const calendarRef = useRef(null);
  const [title, setTitle] = useState("");

  // ── Get FC API ─────────────────────────────────
  const getApi = useCallback(() => calendarRef.current?.getApi(), []);

  // ── Sync view when currentView prop changes ────
  useEffect(() => {
    const api = getApi();
    if (api && api.view.type !== currentView) {
      api.changeView(currentView);
      setTitle(api.view.title);
    }
  }, [currentView, getApi]);

  // ── Expose navigation methods to parent ────────
  useImperativeHandle(
    ref,
    () => ({
      prev() {
        const api = getApi();
        if (api) {
          api.prev();
          setTitle(api.view.title);
          onDateRangeChange?.({
            start: api.view.activeStart,
            end: api.view.activeEnd,
          });
        }
      },
      next() {
        const api = getApi();
        if (api) {
          api.next();
          setTitle(api.view.title);
          onDateRangeChange?.({
            start: api.view.activeStart,
            end: api.view.activeEnd,
          });
        }
      },
      today() {
        const api = getApi();
        if (api) {
          api.today();
          setTitle(api.view.title);
          onDateRangeChange?.({
            start: api.view.activeStart,
            end: api.view.activeEnd,
          });
        }
      },
      getTitle() {
        return title;
      },
    }),
    [getApi, title, onDateRangeChange]
  );

  // ── FullCalendar callbacks ─────────────────────
  const handleDatesSet = useCallback(
    (arg) => {
      setTitle(arg.view.title);
      onDateRangeChange?.({ start: arg.start, end: arg.end });
    },
    [onDateRangeChange]
  );

  const handleDateClick = useCallback(
    (arg) => {
      onDateClick?.(arg.date, arg.view.type);
    },
    [onDateClick]
  );

  const handleEventClick = useCallback(
    (arg) => {
      arg.jsEvent.preventDefault();
      onEventClick?.(arg.event.id);
    },
    [onEventClick]
  );

  const handleEventDrop = useCallback(
    (arg) => {
      const result = onEventDrop?.(arg.event.id, arg.event.start, arg.event.end);
      if (result === false) arg.revert();
    },
    [onEventDrop]
  );

  const handleEventResize = useCallback(
    (arg) => {
      const result = onEventResize?.(
        arg.event.id,
        arg.event.start,
        arg.event.end
      );
      if (result === false) arg.revert();
    },
    [onEventResize]
  );

  const renderEventContent = useCallback((eventInfo) => {
    return <CalendarEventContent eventInfo={eventInfo} />;
  }, []);

  return (
    <div
      className={cn(
        "calendar-wrapper relative",
        loading && "opacity-60 pointer-events-none"
      )}
    >
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/30 backdrop-blur-[1px] rounded-lg">
          <div className="flex items-center gap-2 bg-background/90 px-4 py-2 rounded-full shadow-sm border">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground font-medium">
              Memuat...
            </span>
          </div>
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={currentView}
        headerToolbar={false}
        events={events}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={3}
        moreLinkText={(n) => `+${n} lainnya`}
        moreLinkClick="popover"
        // Locale
        locale="id"
        firstDay={1}
        buttonText={{
          today: "Hari Ini",
          month: "Bulanan",
          week: "Mingguan",
          day: "Harian",
        }}
        // Layout
        height="auto"
        contentHeight="auto"
        aspectRatio={1.8}
        expandRows={true}
        stickyHeaderDates={true}
        // Day headers
        dayHeaderFormat={{ weekday: "short" }}
        // Interaction
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        datesSet={handleDatesSet}
        // Rendering
        eventContent={renderEventContent}
        eventDisplay="block"
        // Time grid
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        slotDuration="01:00:00"
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        allDayText="Sepanjang Hari"
        nowIndicator={true}
      />
    </div>
  );
});
