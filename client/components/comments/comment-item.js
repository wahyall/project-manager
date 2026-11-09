"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Reply,
  CheckCircle2,
  SmilePlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MentionEditor, MentionReadOnly } from "../mention-editor";

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onAddReaction,
  onRemoveReaction,
  onResolve,
  onUnresolve,
  isReply = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editMentions, setEditMentions] = useState(comment.mentions || []);

  const handleEdit = () => {
    onEdit(comment._id, editContent, editMentions);
    setIsEditing(false);
  };

  const isAuthor =
    comment.authorId?._id === currentUserId ||
    comment.authorId === currentUserId;

  return (
    <div
      className={cn(
        "flex gap-3 py-3 transition-colors rounded-xl px-2 -mx-2 hover:bg-muted/30 group",
        isReply && "pl-10",
      )}
    >
      <Avatar className={cn("h-7.5 w-7.5 shrink-0 ring-1 ring-border/80", isReply && "h-6 w-6")}>
        <AvatarImage src={comment.authorId?.avatar} />
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
          {comment.authorId?.name?.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-foreground tracking-tight">
              {comment.authorId?.name}
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: id,
              })}
            </span>
            {comment.isEdited && (
              <span className="text-[10px] text-muted-foreground/60 italic">
                (diedit)
              </span>
            )}
            {comment.isResolved && !isReply && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Selesai
              </span>
            )}
          </div>

          {!comment.isDeleted && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl border border-border/70 bg-background/90 px-1 py-0.5 shadow-2xs backdrop-blur-xs">
              {!isReply && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-lg hover:bg-muted"
                  onClick={() => onReply(comment._id)}
                  title="Balas komentar"
                >
                  <Reply className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:bg-muted" title="Beri reaksi">
                    <SmilePlus className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 border-none w-auto rounded-2xl shadow-xl overflow-hidden"
                  side="top"
                  align="center"
                >
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji) =>
                      onAddReaction(comment._id, emoji.native)
                    }
                    theme="light"
                    set="native"
                    previewPosition="none"
                    skinSelectionPosition="none"
                  />
                </PopoverContent>
              </Popover>

              {(isAuthor || !isReply) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:bg-muted">
                      <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 rounded-xl border-border/80 shadow-lg p-1">
                    {isAuthor && (
                      <DropdownMenuItem
                        className="text-xs gap-2 rounded-lg"
                        onClick={() => {
                          setIsEditing(true);
                          setEditContent(comment.content);
                          setEditMentions(comment.mentions || []);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit Komentar
                      </DropdownMenuItem>
                    )}
                    {!isReply &&
                      (comment.isResolved ? (
                        <DropdownMenuItem
                          className="text-xs gap-2 rounded-lg"
                          onClick={() => onUnresolve(comment._id)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Buka Kembali
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-xs gap-2 rounded-lg text-emerald-600 dark:text-emerald-400 font-medium"
                          onClick={() => onResolve(comment._id)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Tandai Selesai
                        </DropdownMenuItem>
                      ))}
                    {isAuthor && (
                      <DropdownMenuItem
                        className="text-xs gap-2 rounded-lg text-destructive focus:text-destructive"
                        onClick={() => onDelete(comment._id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Hapus
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1 space-y-2">
            <div className="rounded-xl border border-border/80 bg-background/80 p-2 shadow-2xs min-h-[60px] relative z-10 focus-within:ring-2 focus-within:ring-primary/20">
              <MentionEditor
                workspaceId={comment.workspaceId}
                initialContent={editContent}
                onChange={(val) => setEditContent(val)}
                onMentionsChange={(m) => setEditMentions(m)}
                minimal={true}
                className="blocknote-compact px-1 py-1"
              />
            </div>
            <div className="flex justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-lg text-xs"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                  setEditMentions(comment.mentions || []);
                }}
              >
                Batal
              </Button>
              <Button
                size="sm"
                className="h-7 rounded-lg text-xs font-medium shadow-2xs"
                onClick={handleEdit}
                disabled={!editContent || editContent === "[]"}
              >
                Simpan
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "text-xs leading-relaxed whitespace-pre-wrap break-words mt-1",
              comment.isDeleted
                ? "text-muted-foreground/60 italic"
                : "text-foreground/90",
            )}
          >
            {!comment.isDeleted ? (
              <MentionReadOnly
                content={comment.content}
                className="-ml-12 mt-1.5"
              />
            ) : (
              comment.content
            )}
          </div>
        )}

        {/* Reactions */}
        {!comment.isDeleted && comment.reactions?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <TooltipProvider>
              {comment.reactions.map((r) => {
                const hasReacted = r.users.includes(currentUserId);
                return (
                  <Tooltip key={r.emoji}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() =>
                          hasReacted
                            ? onRemoveReaction(comment._id, r.emoji)
                            : onAddReaction(comment._id, r.emoji)
                        }
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border transition-all cursor-pointer shadow-2xs active:scale-95",
                          hasReacted
                            ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                            : "bg-background/80 border-border/80 hover:border-border hover:bg-muted/40 text-muted-foreground",
                        )}
                      >
                        <span>{r.emoji}</span>
                        <span className="font-semibold text-[11px] tabular-nums">{r.users.length}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[11px] p-1 px-2.5 rounded-xl border-border/80">
                      {r.users.length} reaksi
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}
