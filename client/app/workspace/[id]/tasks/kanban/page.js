"use client";

import { use } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Columns3, Plus, GripVertical, CheckSquare } from "lucide-react";

export default function KanbanPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace } = useWorkspace();

  if (!currentWorkspace) return null;

  const columns = currentWorkspace.kanbanColumns || [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Columns3 className="h-6 w-6 text-emerald-500" />
            Kanban Board
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola task secara visual dengan drag & drop
          </p>
        </div>
        <Button className="gap-2 shadow-sm" disabled>
          <Plus className="h-4 w-4" />
          Tambah Task
        </Button>
      </div>

      {/* Kanban columns preview */}
      {columns.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns
            .sort((a, b) => a.order - b.order)
            .map((col) => (
              <div
                key={col._id}
                className="flex flex-col min-w-[280px] max-w-[320px] rounded-xl border bg-card"
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <h3 className="text-sm font-semibold text-foreground flex-1 truncate">
                    {col.name}
                  </h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    0
                  </span>
                </div>

                {/* Empty column body */}
                <div className="flex flex-col items-center justify-center p-6 min-h-[200px]">
                  <CheckSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Belum ada task
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-xs gap-1 text-muted-foreground"
                    disabled
                  >
                    <Plus className="h-3 w-3" />
                    Tambah task
                  </Button>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 mb-6">
              <Columns3 className="h-10 w-10 text-emerald-500/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Belum ada kolom Kanban
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Konfigurasi kolom kanban terlebih dahulu di{" "}
              <a
                href={`/workspace/${id}/settings`}
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Pengaturan Workspace
              </a>
              .
            </p>
          </CardContent>
        </Card>
      )}

      {/* Coming soon notice */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground/60">
          Fitur drag & drop task sedang dalam pengembangan
        </p>
      </div>
    </div>
  );
}

