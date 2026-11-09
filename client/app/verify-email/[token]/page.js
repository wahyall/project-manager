"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ArrowRight, MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const router = useRouter();
  const params = useParams();
  const token = params.token;

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const data = await verifyEmail(token);
        if (cancelled) return;
        setStatus("success");
        setMessage(data?.message || "Email berhasil diverifikasi!");
        setTimeout(() => router.push("/login"), 3000);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          err.response?.data?.message || "Token tidak valid atau sudah expired.",
        );
      }
    };

    if (token) run();

    return () => {
      cancelled = true;
    };
  }, [router, token, verifyEmail]);

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
              {status === "loading" ? (
                <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : status === "success" ? (
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-xs">
                  <XCircle className="h-8 w-8" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {status === "loading"
                  ? "Memverifikasi Email..."
                  : status === "success"
                    ? "Verifikasi Berhasil!"
                    : "Verifikasi Gagal"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {status === "loading"
                  ? "Mohon tunggu sebentar, sistem sedang memverifikasi tautan kamu."
                  : status === "success"
                    ? message || "Akunmu sudah aktif dan siap digunakan."
                    : message || "Tautan verifikasi tidak valid atau telah kedaluwarsa."}
              </p>
            </div>

            {status === "success" && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Mengalihkan ke halaman login dalam beberapa detik...
              </p>
            )}

            <div className="space-y-3 pt-2">
              <Button
                type="button"
                className="w-full h-11 rounded-xl font-semibold shadow-md gap-2"
                variant={status === "success" ? "default" : "outline"}
                onClick={() => router.push("/login")}
              >
                <span>Ke Halaman Masuk</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="text-center">
                <Link
                  href="/register"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Daftar akun lain
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

