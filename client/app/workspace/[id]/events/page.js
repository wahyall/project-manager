"use client";

import { use } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarRange,
  Plus,
  CalendarDays,
  MapPin,
  Clock,
} from "lucide-react";

export default function EventsPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace } = useWorkspace();

  if (!currentWorkspace) return null;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-violet-500" />
            Event
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola jadwal dan event workspace
          </p>
        </div>
        <Button className="gap-2 shadow-sm" disabled>
          <Plus className="h-4 w-4" />
          Buat Event
        </Button>
      </div>

      {/* Empty state */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/10 mb-6">
            <CalendarDays className="h-10 w-10 text-violet-500/60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Belum ada event
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-1">
            Fitur event sedang dalam pengembangan. Kamu akan dapat membuat meeting, deadline, dan milestone workspace di sini.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <CalendarDays className="h-3.5 w-3.5" />
              Jadwalkan meeting
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <Clock className="h-3.5 w-3.5" />
              Set deadline
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <MapPin className="h-3.5 w-3.5" />
              Milestone proyek
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

