"use client";

import { use, useEffect } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { WorkspaceDivisionsSection } from "@/components/workspace/workspace-divisions-section";
import { Users } from "lucide-react";

export default function WorkspaceDivisionsPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace, members, fetchMembers } = useWorkspace();

  useEffect(() => {
    if (id) fetchMembers(id);
  }, [id, fetchMembers]);

  if (!currentWorkspace) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">
            Divisi Workspace
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
            Kelola divisi tetap di workspace{" "}
            <span className="font-medium text-foreground">
              {currentWorkspace.name}
            </span>
            . Divisi event diatur terpisah di dalam tiap event.
          </p>
        </div>
      </div>

      <WorkspaceDivisionsSection workspaceId={id} members={members} />
    </div>
  );
}
