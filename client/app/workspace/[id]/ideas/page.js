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
import { Sprout, Plus, Inbox, Sparkles } from "lucide-react";
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
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      {/* Kepala halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="w-3 h-3" />
              Inkubasi Gagasan
            </span>
          </div>
          <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
              <Sprout className="h-5 w-5" />
            </div>
            Bank Ide
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Kumpulkan dan saring usulan inisiatif tim sebelum diformalkan menjadi event atau task
          </p>
        </div>
        <Button
          className="gap-2 rounded-xl h-9 text-xs shadow-xs self-start sm:self-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Tulis Ide Baru
        </Button>
      </div>

      {/* Ringkasan status */}
      {!loading && ideas.length > 0 && (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {IDEA_STATUS_ORDER.map((status) => {
            const config = IDEA_STATUS_CONFIG[status];
            return (
              <div
                key={status}
                className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-4 shadow-xs"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-2xs",
                    config.iconBgClass,
                  )}
                >
                  <Sprout className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {counts[status]}
                  </p>
                  <p className="truncate text-xs font-medium text-muted-foreground">
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
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive font-medium">
          {error}
        </div>
      )}

      {/* Skeleton pemuatan */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="rounded-2xl border-border/80 shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-3">
                  <Skeleton className="h-11 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-full rounded-md" />
                    <Skeleton className="h-3 w-2/3 rounded-md" />
                    <div className="flex items-center gap-2 pt-1">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-3 w-20 rounded-md" />
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
        <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
              <Inbox className="h-8 w-8" />
            </div>
            <h3 className="mb-1 text-base font-bold text-foreground">
              {isFiltering ? "Tidak ada ide yang cocok" : "Belum ada usulan ide"}
            </h3>
            <p className="mb-6 max-w-sm text-xs text-muted-foreground leading-relaxed">
              {isFiltering
                ? "Coba sesuaikan kata kunci atau bersihkan kriteria filter pencarian."
                : "Tuliskan ide pertama. Bank Ide adalah tempat mengumpulkan gagasan segar tim agar tidak terlupakan."}
            </p>
            {!isFiltering && (
              <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-xl text-xs shadow-xs">
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
        workspaceId={id}
      />
    </div>
  );
}
