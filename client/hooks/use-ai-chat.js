"use client";

import { useCopilotReadable } from "@copilotkit/react-core";
import { useWorkspace } from "@/contexts/workspace-context";
import { useMemo } from "react";

export function useAiChatContext() {
  const { currentWorkspace, members } = useWorkspace();

  const workspaceInfo = useMemo(() => {
    if (!currentWorkspace) return null;
    return {
      id: currentWorkspace._id,
      name: currentWorkspace.name,
      description: currentWorkspace.description || "",
      memberCount: currentWorkspace.memberCount || 0,
    };
  }, [currentWorkspace]);

  const kanbanColumns = useMemo(() => {
    if (!currentWorkspace?.kanbanColumns) return [];
    return [...currentWorkspace.kanbanColumns]
      .sort((a, b) => a.order - b.order)
      .map((col) => ({ id: col._id, name: col.name, order: col.order }));
  }, [currentWorkspace?.kanbanColumns]);

  const memberList = useMemo(() => {
    if (!members?.length) return [];
    return members.map((m) => ({
      id: m.user?._id || m._id,
      name: m.user?.name || m.name,
      email: m.user?.email || m.email,
      role: m.role,
    }));
  }, [members]);

  useCopilotReadable({
    description:
      "Informasi workspace saat ini: nama, deskripsi, dan jumlah member",
    value: workspaceInfo,
    available: workspaceInfo ? "enabled" : "disabled",
  });

  useCopilotReadable({
    description:
      "Daftar kolom kanban (status task) yang tersedia di workspace ini, urut dari kiri ke kanan",
    value: kanbanColumns,
    available: kanbanColumns.length > 0 ? "enabled" : "disabled",
  });

  useCopilotReadable({
    description:
      "Daftar member workspace beserta role masing-masing (owner, admin, member)",
    value: memberList,
    available: memberList.length > 0 ? "enabled" : "disabled",
  });

  return { workspaceInfo, kanbanColumns, memberList };
}
