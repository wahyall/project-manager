"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { useActivity } from "@/hooks/use-activity";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { ActivityFilters } from "@/components/activity/activity-filters";
import { Card, CardContent } from "@/components/ui/card";
import { History, Sparkles } from "lucide-react";

export default function ActivityPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace, fetchMembers } = useWorkspace();
  const { activities, loading, hasMore, fetchActivities, loadMore } =
    useActivity(id);

  const [filters, setFilters] = useState({});

  // Fetch members for filter dropdown
  useEffect(() => {
    if (id) fetchMembers(id);
  }, [id, fetchMembers]);

  // Fetch activities on mount & filter change
  useEffect(() => {
    fetchActivities(filters);
  }, [fetchActivities, filters]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleLoadMore = useCallback(() => {
    loadMore(filters);
  }, [loadMore, filters]);

  if (!currentWorkspace) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Page header */}
      <div className="pb-2 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3 h-3" />
            Audit & Jejak Aktivitas
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-muted/60 border border-border/80 text-foreground">
            <History className="h-5 w-5" />
          </div>
          Activity Log
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Pantau seluruh rekaman perubahan task, event, ide, dan status workspace{" "}
          <span className="font-semibold text-foreground">
            {currentWorkspace.name}
          </span>
        </p>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardContent className="p-3 sm:p-4">
          <ActivityFilters onChange={handleFilterChange} />
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardContent className="pt-6 sm:p-6">
          <ActivityTimeline
            activities={activities}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            emptyMessage="Belum ada rekaman aktivitas di workspace ini"
          />
        </CardContent>
      </Card>
    </div>
  );
}
