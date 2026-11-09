"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

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
          err.response?.data?.message || "Token tidak valid atau sudah expired."
        );
      }
    };

    if (token) run();

    return () => {
      cancelled = true;
    };
  }, [router, token, verifyEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4 sm:p-6 lg:p-8">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10 space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center shadow-lg shadow-primary/20 ring-4 ring-primary/10">
            YN
          </div>
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
            YukNgaji Surabaya Platform
          </p>
        </div>

        {/* Clean single surface card */}
        <div className="rounded-2xl border border-border/80 bg-card/85 backdrop-blur-md p-6 sm:p-8 shadow-xl space-y-6 text-center">
          {/* Status Icon */}
          <div className="flex justify-center">
            {status === "loading" ? (
              <div className="h-20 w-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs border border-primary/20">
                <Loader2 className="h-10 w-10 animate-spin" />
              </div>
            ) : status === "success" ? (
              <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs border border-emerald-500/20">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-xs border border-destructive/20">
                <XCircle className="h-10 w-10" />
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
            <p className="text-sm text-muted-foreground leading-relaxed">
              {status === "loading"
                ? "Mohon tunggu sebentar, sistem sedang memvalidasi token verifikasi akun kamu."
                : status === "success"
                ? message || "Akunmu sudah aktif dan siap digunakan."
                : message || "Tautan verifikasi tidak valid atau telah kedaluwarsa."}
            </p>
          </div>

          {status === "success" && (
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2 px-3">
              <Sparkles className="h-4 w-4 animate-spin text-emerald-500" />
              <span>Mengalihkan otomatis ke halaman login dalam 3 detik...</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 text-xs text-destructive/90 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-left">
              <ShieldCheck className="h-4 w-4 shrink-0 text-destructive" />
              <span>Silakan login kembali untuk mengirim ulang email verifikasi atau daftarkan akun baru.</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              className="w-full h-11 rounded-xl font-semibold shadow-md gap-2 transition-transform active:scale-[0.98]"
              variant={status === "success" ? "default" : "outline"}
              onClick={() => router.push("/login")}
            >
              <span>Ke Halaman Masuk</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="text-center">
              <Link
                href="/register"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Daftar akun baru
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
