"use client";

import { useWorkspaceDivisions } from "@/hooks/use-workspace-divisions";
import { DivisionManager } from "@/components/divisions/division-manager";

/**
 * WorkspaceDivisionsSection: Kelola Divisi Workspace.
 * Divisi milik workspace, diisi dari member workspace,
 * dengan ketua (leader) per divisi. UI dirender oleh DivisionManager
 * agar konsisten dengan Divisi Event.
 */
export function WorkspaceDivisionsSection({ workspaceId, members = [] }) {
  const divisions = useWorkspaceDivisions(workspaceId);

  return (
    <DivisionManager
      title="Divisi Workspace"
      subtitle="Buat divisi tetap workspace, tambahkan member, lalu tentukan ketuanya."
      divisions={divisions.divisions}
      loading={divisions.loading}
      error={divisions.error}
      onRetry={divisions.fetchDivisions}
      members={members}
      allowAddAsLeader
      actions={divisions}
      memberSearchHint="Cari member workspace"
      detailBaseUrl={`/workspace/${workspaceId}/divisions`}
    />
  );
}
