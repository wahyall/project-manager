"use client";

import { MessageSquare } from "lucide-react";

export function TabComment() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20 mb-4">
        <MessageSquare className="h-8 w-8 text-blue-400" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Komentar
      </h3>
      <p className="text-xs text-muted-foreground max-w-[240px]">
        Fitur komentar dan diskusi akan tersedia di Fase 4 — Kolaborasi &
        Notifikasi.
      </p>
    </div>
  );
}

