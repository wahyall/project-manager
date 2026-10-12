"use client";

import { useEventDivisions } from "@/hooks/use-event-divisions";
import { DivisionManager } from "@/components/divisions/division-manager";

export function EventDivisionsSection({ event, workspaceId, members = [] }) {
  const divisions = useEventDivisions(workspaceId, event._id);

  return (
    <DivisionManager
      title="Divisi"
      subtitle="Kelompokkan anggota event ke dalam divisi agar tugas terbagi jelas."
      divisions={divisions.divisions}
      loading={divisions.loading}
      error={divisions.error}
      onRetry={divisions.fetchDivisions}
      members={members}
      allowAddAsLeader={false}
      actions={divisions}
      memberSearchHint="Cari member event"
    />
  );
}
