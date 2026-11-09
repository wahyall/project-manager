"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  HeartHandshake,
  CalendarRange,
  Columns3,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { login, resendVerification } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setShowResend(false);
    setLoading(true);

    try {
      await login(email, password);
      router.push("/workspaces");
    } catch (err) {
      setError(err.response?.data?.message || "Terjadi kesalahan. Coba lagi.");
      setShowResend(!!err.response?.data?.emailNotVerified);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setResendLoading(true);
    try {
      const data = await resendVerification(email);
      setInfo(data?.message || "Tautan verifikasi telah dikirim ke inbox emailmu.");
    } catch (err) {
      setError(err.response?.data?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background bg-dot-pattern p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Side: Brand Story & Value Proposition (Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-2">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>YukNgaji Surabaya Workspace</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.12]">
              Satu Ruang Kerja untuk Seluruh Tim & Dakwah
            </h1>

            <p className="text-base text-muted-foreground leading-relaxed">
              Platform terpadu untuk pengurus, panitia event, dan relawan. Kelola program acara, koordinasi tugas divisi, hingga transparansi dana Baitul Maal secara rapi dan real-time.
            </p>
          </div>

          {/* Value props list */}
          <div className="space-y-3">
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-card/75 border border-border/70 backdrop-blur-md shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div className="text-sm">
                <span className="font-bold text-foreground block">Event & Task Kanban Terintegrasi</span>
                <span className="text-xs text-muted-foreground">Rundown acara, tenggat waktu, dan tracking progres antar divisi</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-card/75 border border-border/70 backdrop-blur-md shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div className="text-sm">
                <span className="font-bold text-foreground block">Baitul Maal (BM) Amanah</span>
                <span className="text-xs text-muted-foreground">Pencatatan kas transparan, infaq rutin, dan database binaan jamaah</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground pt-4 border-t border-border/50 flex items-center justify-between">
            <span>Komunitas YukNgaji Surabaya</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>

        {/* Right Side: Login Box */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-xl p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="space-y-2 text-center lg:text-left">
              <div className="lg:hidden inline-flex items-center justify-center mb-2">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-black flex items-center justify-center text-sm shadow-md ring-1 ring-primary/25">
                  YN
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Selamat Datang
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Masuk ke akunmu untuk mengakses ruang kerja komunitas
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 bg-destructive/10 text-destructive text-xs px-3.5 py-3 rounded-xl border border-destructive/20 font-medium">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="flex-1">{error}</span>
                </div>
              )}
              {info && (
                <div className="flex items-start gap-2.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs px-3.5 py-3 rounded-xl border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="flex-1">{info}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-10 h-11 rounded-xl bg-background/50 border-border/80 focus-visible:ring-primary/25 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline underline-offset-2"
                  >
                    Lupa password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pl-10 pr-10 h-11 rounded-xl bg-background/50 border-border/80 focus-visible:ring-primary/25 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {showResend && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs font-medium"
                  onClick={handleResend}
                  disabled={resendLoading || !email}
                >
                  {resendLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {resendLoading ? "Mengirim ulang..." : "Kirim ulang email verifikasi"}
                </Button>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl font-semibold shadow-md gap-2 mt-2 transition-all duration-200 active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Akun</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Belum punya akun?{" "}
                <Link href="/register" className="font-semibold text-primary hover:underline underline-offset-2">
                  Daftar di sini
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
