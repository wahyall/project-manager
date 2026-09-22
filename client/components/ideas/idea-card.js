"use client";

import { Card, CardContent } from "@/components/ui/card";
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
    <Card
      onClick={() => onClick?.(idea)}
      className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
    >
      <CardContent className="p-0">
        {/* Status jadi garis tipis di tepi atas, bukan badge, supaya
            angka dukungan yang jadi titik berat visual kartu. */}
        <div className={cn("h-1 w-full", config.barClass)} />

        <div className="flex gap-3 p-4">
          <IdeaVoteButton
            voteCount={idea.voteCount}
            hasVoted={idea.hasVoted}
            onVote={() => onVote(idea._id)}
            onUnvote={() => onUnvote(idea._id)}
          />

          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
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
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
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

            <div className="flex items-center justify-between pt-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={author?.avatar} alt="" />
                  <AvatarFallback className="text-[9px]">
                    {author?.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-muted-foreground">
                  {author?.name || "Tidak diketahui"}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2.5 text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}
