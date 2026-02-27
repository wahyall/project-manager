"use client";

import { use, useState } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday-based
}

export default function CalendarPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace } = useWorkspace();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  if (!currentWorkspace) return null;

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-orange-500" />
            Kalender
          </h1>
          <p className="text-muted-foreground mt-1">
            Lihat task dan deadline dalam tampilan kalender
          </p>
        </div>
        <Button className="gap-2 shadow-sm" disabled>
          <Plus className="h-4 w-4" />
          Tambah Task
        </Button>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before the 1st */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 sm:h-24 border-t border-l first:border-l-0 border-border/50" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const cellIndex = firstDay + i;
              return (
                <div
                  key={day}
                  className={`h-20 sm:h-24 border-t border-l border-border/50 p-1.5 transition-colors hover:bg-accent/30 cursor-pointer
                    ${cellIndex % 7 === 0 ? "border-l-0" : ""}
                  `}
                >
                  <span
                    className={`
                      inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                      ${isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"}
                    `}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Coming soon notice */}
          <div className="text-center mt-6 py-3">
            <p className="text-xs text-muted-foreground/60">
              Task dan deadline akan ditampilkan di kalender — segera hadir
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

