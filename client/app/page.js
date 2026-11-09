"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Sparkles } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/workspaces");
    } else {
      router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background bg-dot-pattern p-4 relative overflow-hidden">
      {/* Subtle ambient light */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-sm">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-black text-xl shadow-lg ring-1 ring-primary/25">
          YN
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-background" />
          </span>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            YukNgaji Surabaya
          </h1>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span>Menyiapkan ruang kerja...</span>
          </p>
        </div>
      </div>
    </div>
  );
}
