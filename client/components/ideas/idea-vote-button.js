"use client";

import { useState } from "react";
import { ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tombol dukungan, tersusun vertikal: panah di atas, angka di bawah.
 *
 * Angka diperbarui optimistis supaya terasa seketika. Begitu request
 * selesai (berhasil maupun gagal), state optimistis dikosongkan lagi
 * supaya komponen kembali percaya pada prop voteCount/hasVoted asli —
 * termasuk update real-time dari user lain lewat socket idea:voted.
 */
export function IdeaVoteButton({
  voteCount = 0,
  hasVoted = false,
  onVote,
  onUnvote,
  size = "sm",
  disabled = false,
  className,
}) {
  const [busy, setBusy] = useState(false);
  const [optimistic, setOptimistic] = useState(null);

  const shownVoted = optimistic ? optimistic.hasVoted : hasVoted;
  const shownCount = optimistic ? optimistic.voteCount : voteCount;

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy || disabled) return;

    const next = {
      hasVoted: !shownVoted,
      voteCount: shownVoted ? shownCount - 1 : shownCount + 1,
    };
    setOptimistic(next);
    setBusy(true);
    try {
      await (shownVoted ? onUnvote() : onVote());
      setOptimistic(null);
    } catch {
      setOptimistic(null);
    } finally {
      setBusy(false);
    }
  };

  const isLarge = size === "lg";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      aria-pressed={shownVoted}
      aria-label={shownVoted ? "Tarik dukungan" : "Dukung ide ini"}
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer",
        "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs hover:shadow-xs",
        isLarge ? "h-14 w-12 gap-0.5" : "h-11 w-9.5 gap-0",
        shownVoted
          ? "border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-400 font-semibold ring-1 ring-violet-500/20"
          : "border-border/80 bg-background/80 text-muted-foreground hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400",
        className,
      )}
    >
      {busy ? (
        <Loader2 className={cn("animate-spin", isLarge ? "h-4 w-4" : "h-3.5 w-3.5")} />
      ) : (
        <ChevronUp
          className={cn(
            "transition-transform group-hover:-translate-y-0.5",
            isLarge ? "h-5 w-5" : "h-4 w-4",
          )}
          strokeWidth={shownVoted ? 3 : 2.5}
        />
      )}
      <span
        className={cn(
          "font-bold tabular-nums tracking-tight",
          isLarge ? "text-sm" : "text-[11px]",
        )}
      >
        {shownCount}
      </span>
    </button>
  );
}
