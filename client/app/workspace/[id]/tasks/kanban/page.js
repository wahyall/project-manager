"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

// Route lama digabung ke /tasks (view Kanban) — redirect untuk kompatibilitas.
export default function LegacyKanbanRedirect({ params }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    const qs = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`/workspace/${id}/tasks${qs}`);
  }, [id, router]);

  return null;
}
