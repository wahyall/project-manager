"use client";

import { History } from "lucide-react";

export function TabActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-900/20 mb-4">
        <History className="h-8 w-8 text-purple-400" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Activity Log
      </h3>
      <p className="text-xs text-muted-foreground max-w-[240px]">
        Riwayat perubahan task akan tersedia di Fase 3 — Activity Log & Audit
        Trail.
      </p>
    </div>
  );
}

