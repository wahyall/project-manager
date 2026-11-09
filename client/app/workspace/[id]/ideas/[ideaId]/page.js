"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/contexts/auth-context";
import { useIdeas } from "@/hooks/use-ideas";
import { IdeaStatusBadge } from "@/components/ideas/idea-status-badge";
import { IdeaVoteButton } from "@/components/ideas/idea-vote-button";
import { IdeaOverviewTab } from "@/components/ideas/idea-overview-tab";
import { IdeaEventsTab } from "@/components/ideas/idea-events-tab";
import { CommentThread } from "@/components/comments/comment-thread";
import { DeleteIdeaDialog } from "@/components/ideas/delete-idea-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, MoreHorizontal, Pencil, Trash2, Sprout } from "lucide-react";
import { toast } from "sonner";

export default function IdeaDetailPage({ params }) {
  const { id, ideaId } = use(params);
  const router = useRouter();
  const { currentWorkspace, members, fetchMembers } = useWorkspace();
  const { user } = useAuth();
  const { getIdea, updateIdea, deleteIdea, voteIdea, unvoteIdea } =
    useIdeas(id);

  const [idea, setIdea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (id) fetchMembers(id);
  }, [id, fetchMembers]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getIdea(ideaId)
      .then((data) => {
        if (!active) return;
        setIdea(data);
        setTitle(data.title);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || "Gagal memuat ide");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ideaId, getIdea]);

  const handleUpdate = useCallback(
    async (updates) => {
      const updated = await updateIdea(ideaId, updates);
      setIdea((prev) => ({ ...prev, ...updated, relatedEvents: prev?.relatedEvents ?? [] }));
      return updated;
    },
    [ideaId, updateIdea],
  );

  const handleTitleSave = async () => {
    setEditingTitle(false);
    const trimmed = title.trim();
    if (!trimmed || trimmed === idea.title) {
      setTitle(idea.title);
      return;
    }
    try {
      await handleUpdate({ title: trimmed });
      toast.success("Judul tersimpan");
    } catch (err) {
      setTitle(idea.title);
      toast.error(err.response?.data?.message || "Gagal menyimpan judul");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteIdea(ideaId);
      toast.success("Ide berhasil dihapus");
      router.push(`/workspace/${id}/ideas`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus ide");
    }
  };

  if (!currentWorkspace) return null;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-6 w-24 rounded-lg" />
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-destructive">
            {error || "Ide tidak ditemukan"}
          </p>
          <Button
            variant="outline"
            className="gap-2 rounded-xl text-xs"
            onClick={() => router.push(`/workspace/${id}/ideas`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Bank Ide
          </Button>
        </div>
      </div>
    );
  }

  const canManage =
    idea.createdBy?._id === user?._id ||
    ["owner", "admin"].includes(currentWorkspace.role);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      {/* Navigation & header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground rounded-xl h-8.5"
          onClick={() => router.push(`/workspace/${id}/ideas`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Bank Ide
        </Button>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8.5 w-8.5 rounded-xl">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-40 shadow-lg">
              <DropdownMenuItem onClick={() => setEditingTitle(true)} className="gap-2 text-xs rounded-lg">
                <Pencil className="h-3.5 w-3.5" />
                Ubah judul
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive gap-2 text-xs rounded-lg"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus ide
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-start gap-4">
        <div className="shrink-0 pt-0.5">
          <IdeaVoteButton
            size="lg"
            voteCount={idea.voteCount}
            hasVoted={idea.hasVoted}
            onVote={async () => {
              const r = await voteIdea(ideaId);
              setIdea((prev) => ({ ...prev, ...r }));
              return r;
            }}
            onUnvote={async () => {
              const r = await unvoteIdea(ideaId);
              setIdea((prev) => ({ ...prev, ...r }));
              return r;
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {editingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setTitle(idea.title);
                  setEditingTitle(false);
                }
              }}
              maxLength={120}
              className="h-auto border border-primary/40 rounded-xl px-3 py-1.5 text-2xl font-bold bg-background shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => canManage && setEditingTitle(true)}
              className={
                canManage
                  ? "cursor-text text-2xl sm:text-3xl font-bold tracking-tight text-foreground hover:text-primary/90 transition-colors"
                  : "text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
              }
              title={canManage ? "Klik untuk mengedit judul" : undefined}
            >
              {idea.title}
            </h1>
          )}
          <div className="flex items-center gap-2 pt-0.5">
            <IdeaStatusBadge status={idea.status} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-5">
        <div className="border-b border-border/60 pb-px">
          <TabsList className="bg-muted/40 p-1 rounded-xl border border-border/60 h-auto inline-flex flex-wrap gap-1">
            <TabsTrigger
              value="overview"
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              Ringkasan Gagasan
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              Event Terkait
              {idea.relatedEvents?.length > 0 && (
                <span className="ml-1.5 font-bold text-2xs px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                  {idea.relatedEvents.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="discussion"
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              Diskusi Tim
              {idea.commentCount > 0 && (
                <span className="ml-1.5 font-bold text-2xs px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                  {idea.commentCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
          <IdeaOverviewTab
            idea={idea}
            onUpdate={handleUpdate}
            members={members}
            workspaceId={id}
            canManage={canManage}
          />
        </TabsContent>
        <TabsContent value="events" className="mt-0 focus-visible:outline-none">
          <IdeaEventsTab
            events={idea.relatedEvents || []}
            workspaceId={id}
          />
        </TabsContent>
        <TabsContent value="discussion" className="mt-0 focus-visible:outline-none">
          <CommentThread
            workspaceId={id}
            targetType="idea"
            targetId={ideaId}
            currentUserId={user?._id}
            members={members}
          />
        </TabsContent>
      </Tabs>

      <DeleteIdeaDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        ideaTitle={idea.title}
        onConfirm={handleDelete}
      />
    </div>
  );
}
