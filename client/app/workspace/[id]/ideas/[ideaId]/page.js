"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/contexts/auth-context";
import { useIdeas } from "@/hooks/use-ideas";
import { IdeaStatusBadge } from "@/components/ideas/idea-status-badge";
import { IdeaVoteButton } from "@/components/ideas/idea-vote-button";
import { IdeaOverviewTab } from "@/components/ideas/idea-overview-tab";
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
import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
      // relatedEvents tidak ikut di balikan PUT, jadi dipertahankan
      // dari state sebelumnya supaya tab Event Terkait tidak kosong.
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
      <div className="mx-auto max-w-4xl space-y-4 p-4 lg:p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="mx-auto max-w-4xl p-4 lg:p-6">
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || "Ide tidak ditemukan"}
        </div>
        <Button
          variant="ghost"
          className="mt-4 gap-2"
          onClick={() => router.push(`/workspace/${id}/ideas`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Bank Ide
        </Button>
      </div>
    );
  }

  const canManage =
    idea.createdBy?._id === user?._id ||
    ["owner", "admin"].includes(currentWorkspace.role);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 gap-2 text-muted-foreground"
        onClick={() => router.push(`/workspace/${id}/ideas`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Bank Ide
      </Button>

      <div className="flex items-start gap-4">
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
              className="h-auto border-none px-0 text-2xl font-bold shadow-none focus-visible:ring-0"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => canManage && setEditingTitle(true)}
              className={
                canManage
                  ? "cursor-text text-2xl font-bold leading-tight text-foreground"
                  : "text-2xl font-bold leading-tight text-foreground"
              }
            >
              {idea.title}
            </h1>
          )}
          <IdeaStatusBadge status={idea.status} />
        </div>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingTitle(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Ubah judul
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus ide
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <IdeaOverviewTab
            idea={idea}
            onUpdate={handleUpdate}
            members={members}
            workspaceId={id}
            canManage={canManage}
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
