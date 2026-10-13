"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DivisionDetailRedirectPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/workspace/${id}/baitul-mal`);
  }, [id, router]);

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm">Mengarahkan ke menu Baitul Maal...</span>
      </div>
    </div>
  );
}
