"use client";

import { useState } from "react";
import { ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tombol dukungan, tersusun vertikal: panah di atas, angka di bawah.
 *
 * Angka diperbarui optimistis supaya terasa seketika, lalu dikoreksi
 * dari balikan server. Kalau gagal, nilai dikembalikan seperti semula.
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
    // Kartu ide bisa diklik untuk membuka detail, jadi klik tombol
    // ini tidak boleh ikut memicu navigasi.
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
      const result = shownVoted ? await onUnvote() : await onVote();
      if (result) setOptimistic(result);
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
        "flex shrink-0 flex-col items-center justify-center rounded-lg border transition-all",
        "active:scale-[0.96] disabled:opacity-60",
        isLarge ? "h-14 w-12 gap-0.5" : "h-11 w-9 gap-0",
        shownVoted
          ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
          : "border-border bg-background text-muted-foreground hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-600 dark:hover:text-violet-400",
        className,
      )}
    >
      {busy ? (
        <Loader2 className={cn("animate-spin", isLarge ? "h-4 w-4" : "h-3.5 w-3.5")} />
      ) : (
        <ChevronUp
          className={cn(isLarge ? "h-5 w-5" : "h-4 w-4")}
          strokeWidth={shownVoted ? 3 : 2.25}
        />
      )}
      <span
        className={cn(
          "font-semibold tabular-nums",
          isLarge ? "text-sm" : "text-xs",
        )}
      >
        {shownCount}
      </span>
    </button>
  );
}
