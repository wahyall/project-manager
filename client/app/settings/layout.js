"use client";

import ProtectedRoute from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles, User } from "lucide-react";

export default function SettingsLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-[100dvh] bg-background bg-dot-pattern flex flex-col">
        {/* Top navigation bar */}
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex h-14 items-center gap-4 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2 text-muted-foreground hover:text-foreground rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Kembali</span>
            </Button>

            <div className="h-4 w-px bg-border/60" />

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground">
                Pengaturan Akun
              </span>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="hidden sm:inline text-xs font-medium text-foreground">
                {user?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

