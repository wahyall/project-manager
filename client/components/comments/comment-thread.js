"use client";

import { useState } from "react";
import {
  MessageSquare,
  Send,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Reply,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useComments } from "@/hooks/use-comments";
import { CommentItem } from "./comment-item";
import { MentionEditor } from "../mention-editor";

export function CommentThread({
  workspaceId,
  targetType,
  targetId,
  currentUserId,
  members = [],
}) {
  const {
    comments,
    loading,
    createComment,
    updateComment,
    deleteComment,
    addReaction,
    removeReaction,
    resolveThread,
    unresolveThread,
  } = useComments(workspaceId, targetType, targetId);

  const [newComment, setNewComment] = useState("");
  const [mentions, setMentions] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [showResolved, setShowResolved] = useState(false);
  const [sortOrder, setSortOrder] = useState("asc");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!newComment.trim() || newComment === "[]" || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment(newComment, replyTo, mentions);
      setNewComment("");
      setMentions([]);
      setReplyTo(null);
      setEditorKey((prev) => prev + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeComments = comments.filter((c) => !c.isResolved);
  const resolvedComments = comments.filter((c) => c.isResolved);

  const displayComments = [...(showResolved ? comments : activeComments)];

  if (sortOrder === "desc") {
    displayComments.reverse();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 className="h-7 w-7 text-primary animate-spin mb-3" />
        <p className="text-xs font-medium text-muted-foreground">Memuat komentar & diskusi...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 sticky top-0 bg-background/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-foreground tracking-tight">
            {comments.length} Komentar
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {resolvedComments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 text-[11px] gap-1.5 px-2.5 rounded-xl font-medium",
                showResolved
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setShowResolved(!showResolved)}
            >
              <CheckCircle2 className="h-3 w-3" />
              {showResolved
                ? "Sembunyikan Selesai"
                : `Selesai (${resolvedComments.length})`}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] gap-1 px-2.5 rounded-xl text-muted-foreground hover:text-foreground font-medium"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortOrder === "asc" ? "Terlama" : "Terbaru"}
          </Button>
        </div>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {displayComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3 text-muted-foreground/60 shadow-2xs">
              <MessageSquare className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-foreground">Belum ada komentar</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tulis catatan atau mulai diskusi bersama tim di bawah.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {displayComments.map((comment) => (
              <div key={comment._id} className="py-2.5">
                <CommentItem
                  comment={comment}
                  currentUserId={currentUserId}
                  onReply={(id) => setReplyTo(id)}
                  onEdit={updateComment}
                  onDelete={deleteComment}
                  onAddReaction={addReaction}
                  onRemoveReaction={removeReaction}
                  onResolve={resolveThread}
                  onUnresolve={unresolveThread}
                />

                {/* Replies */}
                {comment.replies?.length > 0 && (
                  <div className="space-y-1.5 mt-1 border-l-2 border-border/50 ml-4 pl-1">
                    {comment.replies.map((reply) => (
                      <CommentItem
                        key={reply._id}
                        comment={reply}
                        currentUserId={currentUserId}
                        onEdit={updateComment}
                        onDelete={deleteComment}
                        onAddReaction={addReaction}
                        onRemoveReaction={removeReaction}
                        isReply
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area (Sticky Bottom) */}
      <div className="border-t border-border/60 bg-background/95 backdrop-blur-md p-4 pt-3 pb-5 sticky bottom-0">
        {replyTo && (
          <div className="flex items-center justify-between bg-primary/5 rounded-t-xl px-3 py-1.5 border border-b-0 border-primary/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                Membalas{" "}
                <span className="font-semibold text-foreground">
                  {comments.find((c) => c._id === replyTo)?.authorId?.name ||
                    "komentar"}
                </span>
              </span>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="hover:text-foreground p-0.5 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={cn(
            "relative flex flex-col gap-2 rounded-2xl border border-border/80 bg-card/60 shadow-2xs backdrop-blur-xs transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50",
            replyTo && "rounded-tl-none border-t-primary/20",
          )}
        >
          <div className="min-h-[75px] w-full py-2 px-5 bg-transparent text-xs rounded-t-2xl">
            <MentionEditor
              key={`comment-editor-${editorKey}`}
              workspaceId={workspaceId}
              initialContent={newComment}
              onChange={(val) => setNewComment(val)}
              onMentionsChange={(m) => setMentions(m)}
              placeholder="Tulis komentar... Ketik @ untuk mention"
              className="blocknote-compact"
            />
          </div>

          <div className="flex items-center justify-end px-3 pb-3">
            <Button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
              className="h-8 gap-1.5 rounded-xl px-3.5 text-xs font-semibold shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Kirim</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
