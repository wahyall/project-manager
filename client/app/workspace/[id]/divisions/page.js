"use client";

import { use, useEffect } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { WorkspaceDivisionsSection } from "@/components/workspace/workspace-divisions-section";
import { Users, Sparkles, Building2 } from "lucide-react";

export default function WorkspaceDivisionsPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace, members, fetchMembers } = useWorkspace();

  useEffect(() => {
    if (id) fetchMembers(id);
  }, [id, fetchMembers]);

  if (!currentWorkspace) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      {/* Page Header */}
      <div className="pb-3 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            Struktur Organisasi
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
            <Users className="h-5 w-5" />
          </div>
          Divisi Tetap Workspace
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
          Kelola departemen dan struktur kepengurusan tetap di workspace{" "}
          <span className="font-semibold text-foreground">
            {currentWorkspace.name}
          </span>
          . Divisi khusus kepanitiaan event dapat dikelola mandiri di dalam setiap modul event.
        </p>
      </div>

      <WorkspaceDivisionsSection workspaceId={id} members={members} />
    </div>
  );
}
