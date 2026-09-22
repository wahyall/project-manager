"use client";

import { cn } from "@/lib/utils";

/**
 * Sumber tunggal warna dan label status ide.
 * Semua komponen lain mengimpor dari sini, jangan menulis ulang kelasnya.
 */
export const IDEA_STATUS_CONFIG = {
  baru: {
    label: "Baru",
    badgeClass:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    dotClass: "bg-blue-500",
    barClass: "bg-blue-500",
    pillClass: "bg-blue-500/5 border-blue-500/10",
    iconBgClass: "bg-blue-500/10 text-blue-500",
  },
  dipertimbangkan: {
    label: "Dipertimbangkan",
    badgeClass:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-500",
    barClass: "bg-amber-500",
    pillClass: "bg-amber-500/5 border-amber-500/10",
    iconBgClass: "bg-amber-500/10 text-amber-500",
  },
  direalisasi: {
    label: "Direalisasi",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-500",
    barClass: "bg-emerald-500",
    pillClass: "bg-emerald-500/5 border-emerald-500/10",
    iconBgClass: "bg-emerald-500/10 text-emerald-500",
  },
  diarsipkan: {
    label: "Diarsipkan",
    badgeClass:
      "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
    dotClass: "bg-gray-400",
    barClass: "bg-gray-400",
    pillClass: "bg-gray-500/5 border-gray-500/10",
    iconBgClass: "bg-gray-500/10 text-gray-400",
  },
};

export const IDEA_STATUS_ORDER = [
  "baru",
  "dipertimbangkan",
  "direalisasi",
  "diarsipkan",
];

export function IdeaStatusBadge({ status, className }) {
  const config = IDEA_STATUS_CONFIG[status] || IDEA_STATUS_CONFIG.baru;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.badgeClass,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  );
}
