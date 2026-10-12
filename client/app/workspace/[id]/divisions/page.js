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
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-violet-500" />
          Divisi Workspace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola divisi tetap di workspace{" "}
          <span className="font-medium text-foreground">
            {currentWorkspace.name}
          </span>
          . Berbeda dengan Divisi Event yang hanya berlaku di satu event.
        </p>
      </div>

      {/* Alur: buat divisi (Nama + Warna) → tambah member → assign ketua */}
      <WorkspaceDivisionsSection workspaceId={id} members={members} />
    </div>
  );
}
