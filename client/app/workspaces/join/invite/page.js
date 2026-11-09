"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, CheckCircle2, XCircle, LogIn, Mail, ArrowRight, Sparkles, Building2 } from "lucide-react";

function JoinInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus("needLogin");
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("Token undangan tidak ditemukan");
      return;
    }

    const join = async () => {
      setStatus("joining");
      try {
        const { data } = await api.post(
          `/workspaces/join/invite?token=${token}`,
        );
        setStatus("success");
        setMessage(data.message);

        setTimeout(() => {
          if (data.data?.workspace?._id) {
            router.push(`/workspace/${data.data.workspace._id}/settings`);
          } else {
            router.push("/workspaces");
          }
        }, 2000);
      } catch (error) {
        setStatus("error");
        setMessage(
          error.response?.data?.message || "Undangan tidak valid atau sudah expired",
        );
      }
    };

    join();
  }, [token, user, authLoading, router]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background bg-dot-pattern p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Ambient glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        <div className="rounded-2xl border border-border/80 bg-card/95 shadow-xl p-6 sm:p-8 space-y-6 text-center backdrop-blur-sm">
          {/* Status Icon */}
          <div className="flex justify-center">
            {status === "loading" || status === "joining" ? (
              <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : status === "success" ? (
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            ) : status === "needLogin" ? (
              <div className="h-16 w-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                <Mail className="h-8 w-8" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-xs">
                <XCircle className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {status === "loading" || status === "joining"
                ? "Memproses Undangan..."
                : status === "success"
                  ? "Berhasil Bergabung!"
                  : status === "needLogin"
                    ? "Masuk untuk Bergabung"
                    : "Undangan Tidak Valid"}
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {status === "loading" || status === "joining"
                ? "Sedang memverifikasi token undangan workspace..."
                : status === "success"
                  ? message || "Kamu telah resmi ditambahkan ke workspace!"
                  : status === "needLogin"
                    ? "Silakan masuk ke akunmu terlebih dahulu untuk menerima undangan ini."
                    : message || "Tautan undangan tidak berlaku atau telah kedaluwarsa."}
            </p>
          </div>

          {status === "success" && (
            <p className="text-xs text-muted-foreground animate-pulse font-medium">
              Mengalihkan kamu ke workspace...
            </p>
          )}

          <div className="space-y-3 pt-2">
            {status === "needLogin" && (
              <Button asChild className="w-full h-11 rounded-xl font-semibold shadow-md gap-2">
                <Link href={`/login?redirect=/workspaces/join/invite?token=${token}`}>
                  <LogIn className="h-4 w-4" />
                  <span>Masuk ke Akun</span>
                </Link>
              </Button>
            )}

            {status === "error" && (
              <Button asChild variant="outline" className="w-full h-11 rounded-xl font-medium">
                <Link href="/workspaces">
                  <span>Ke Daftar Workspace</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JoinInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <JoinInviteContent />
    </Suspense>
  );
}
