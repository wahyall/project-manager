"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

// Route lama digabung ke /tasks (view Kalender) — redirect untuk kompatibilitas.
export default function LegacyCalendarRedirect({ params }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    const qs =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    if (!qs.get("view")) {
      qs.set("view", "calendar");
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    router.replace(`/workspace/${id}/tasks${suffix}`);
  }, [id, router]);

  return null;
}
