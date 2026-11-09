"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Users, CheckCircle2, XCircle, LogIn, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function JoinWorkspacePage({ params }) {
  const { inviteCode } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | joining | success | error | needLogin
  const [message, setMessage] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus("needLogin");
      return;
    }

    // Auto join
    const join = async () => {
      setStatus("joining");
      try {
        const { data } = await api.post(`/workspaces/join/${inviteCode}`);
        setStatus("success");
        setMessage(data.message);
        setWorkspaceName(data.data?.workspace?.name || "");

        // Auto redirect after 2 seconds
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
          error.response?.data?.message ||
            "Tautan undangan tidak valid atau sudah expired",
        );
      }
    };

    join();
  }, [inviteCode, user, authLoading, router]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background bg-dot-pattern p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        <Card className="glass-panel rounded-2xl shadow-xl border-border/80 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6 text-center">
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
                  <Users className="h-8 w-8" />
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
                  ? "Bergabung ke Workspace..."
                  : status === "success"
                    ? "Berhasil Bergabung!"
                    : status === "needLogin"
                      ? "Masuk untuk Bergabung"
                      : "Gagal Bergabung"}
              </h1>

              <div className="text-sm text-muted-foreground">
                {status === "loading" || status === "joining" ? (
                  "Memproses kode undangan workspace..."
                ) : status === "success" ? (
                  <>
                    <p>{message}</p>
                    {workspaceName && (
                      <p className="mt-2 text-base font-bold text-foreground">
                        {workspaceName}
                      </p>
                    )}
                  </>
                ) : status === "needLogin" ? (
                  "Kamu perlu masuk ke akun terlebih dahulu untuk bergabung ke workspace ini"
                ) : (
                  message
                )}
              </div>
            </div>

            {status === "success" && (
              <p className="text-xs text-muted-foreground animate-pulse font-medium">
                Mengalihkan ke workspace...
              </p>
            )}

            <div className="space-y-3 pt-2">
              {status === "needLogin" && (
                <Button asChild className="w-full h-11 rounded-xl font-semibold shadow-md gap-2">
                  <Link href={`/login?redirect=/workspaces/join/${inviteCode}`}>
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
        </Card>
      </div>
    </div>
  );
}

