"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { useIdeas } from "@/hooks/use-ideas";
import { IdeaCard } from "@/components/ideas/idea-card";
import { IdeaFilterToolbar } from "@/components/ideas/idea-filter-toolbar";
import { CreateIdeaDialog } from "@/components/ideas/create-idea-dialog";
import {
  IDEA_STATUS_CONFIG,
  IDEA_STATUS_ORDER,
} from "@/components/ideas/idea-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sprout, Plus, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function IdeasPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);

  const {
    ideas,
    loading,
    error,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    createIdea,
    voteIdea,
    unvoteIdea,
    fetchIdeas,
  } = useIdeas(id);

  const handleCreate = async (payload) => {
    const created = await createIdea(payload);
    toast.success("Ide berhasil disimpan");
    await fetchIdeas(1);
    return created;
  };

  if (!currentWorkspace) return null;

  const counts = IDEA_STATUS_ORDER.reduce((acc, status) => {
    acc[status] = ideas.filter((i) => i.status === status).length;
    return acc;
  }, {});

  const isFiltering =
    filters.keyword || filters.status.length > 0 || filters.labels.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 lg:p-6">
      {/* Kepala halaman */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
              <Sprout className="h-5 w-5 text-white" />
            </div>
            Bank Ide
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kumpulkan usulan tim sebelum jadi rencana
          </p>
        </div>
        <Button className="gap-2 shadow-sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Tulis Ide
        </Button>
      </div>

      {/* Ringkasan status */}
      {!loading && ideas.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {IDEA_STATUS_ORDER.map((status) => {
            const config = IDEA_STATUS_CONFIG[status];
            return (
              <div
                key={status}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3",
                  config.pillClass,
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    config.iconBgClass,
                  )}
                >
                  <Sprout className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground">
                    {counts[status]}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {config.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <IdeaFilterToolbar
        filters={filters}
        setFilters={setFilters}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        workspaceId={id}
      />

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Skeleton pemuatan, bentuknya mengikuti kartu asli */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="h-1 rounded-t-lg" />
                <div className="flex gap-3 p-4">
                  <Skeleton className="h-11 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <div className="flex items-center gap-2 pt-1">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && ideas.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea._id}
              idea={idea}
              onClick={(i) => router.push(`/workspace/${id}/ideas/${i._id}`)}
              onVote={voteIdea}
              onUnvote={unvoteIdea}
            />
          ))}
        </div>
      )}

      {!loading && ideas.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10">
              <Inbox className="h-10 w-10 text-amber-500/60" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {isFiltering ? "Tidak ada ide yang cocok" : "Belum ada ide"}
            </h3>
            <p className="mb-6 max-w-md text-sm text-muted-foreground">
              {isFiltering
                ? "Coba ubah kata kunci atau filter status."
                : "Tulis ide pertama. Bank Ide adalah tempat menyimpan usulan tim supaya tidak hilang, berbeda dari Brainstorming yang dipakai untuk berpikir bersama."}
            </p>
            {!isFiltering && (
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Tulis Ide Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <CreateIdeaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}
