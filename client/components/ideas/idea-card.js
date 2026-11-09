"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IdeaVoteButton } from "@/components/ideas/idea-vote-button";
import { IDEA_STATUS_CONFIG } from "@/components/ideas/idea-status-badge";
import { MessageSquare, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

// Ambil teks polos dari deskripsi BlockNote untuk cuplikan dua baris
const excerpt = (description) => {
  if (!description) return "";
  try {
    const parsed = JSON.parse(description);
    const blocks = Array.isArray(parsed) ? parsed : parsed?.blocks;
    if (Array.isArray(blocks)) {
      return blocks
        .map((b) => b.content?.map((c) => c.text).join("") || "")
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    // Bukan JSON, pakai apa adanya
  }
  return description;
};

export function IdeaCard({ idea, onClick, onVote, onUnvote }) {
  const config = IDEA_STATUS_CONFIG[idea.status] || IDEA_STATUS_CONFIG.baru;
  const text = excerpt(idea.description);
  const author = idea.createdBy;

  return (
    <div
      onClick={() => onClick?.(idea)}
      className="group cursor-pointer rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
    >
      {/* Status top accent line */}
      <div className={cn("h-1.5 w-full", config.barClass)} />

      <div className="flex gap-3.5 p-4">
        <IdeaVoteButton
          voteCount={idea.voteCount}
          hasVoted={idea.hasVoted}
          onVote={() => onVote(idea._id)}
          onUnvote={() => onUnvote(idea._id)}
          className="rounded-xl shadow-2xs"
        />

        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
            {idea.title}
          </h3>

          {text && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {text}
            </p>
          )}

          {idea.labels?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {idea.labels.map((label) => (
                <span
                  key={label._id}
                  className="rounded-lg px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: `${label.color}1a`,
                    color: label.color,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-5 w-5 rounded-md">
                <AvatarImage src={author?.avatar} alt="" />
                <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                  {author?.name?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-xs font-medium text-muted-foreground">
                {author?.name || "Tidak diketahui"}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2.5 text-muted-foreground font-medium">
              {idea.commentCount > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <MessageSquare className="h-3 w-3" />
                  {idea.commentCount}
                </span>
              )}
              {idea.eventCount > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <CalendarRange className="h-3 w-3" />
                  {idea.eventCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}