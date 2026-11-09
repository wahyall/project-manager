"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function RegisterPage() {
  const { register, resendVerification } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsappNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResendMessage("");

    if (!form.whatsappNumber.trim()) {
      setError("Nomor WhatsApp wajib diisi");
      return;
    }

    let cleanedWa = form.whatsappNumber.trim().replace(/[\s-]/g, "");
    if (cleanedWa.startsWith("0")) {
      cleanedWa = "+62" + cleanedWa.slice(1);
    } else if (cleanedWa.startsWith("62")) {
      cleanedWa = "+" + cleanedWa;
    } else if (!cleanedWa.startsWith("+")) {
      cleanedWa = "+" + cleanedWa;
    }

    if (!/^\+\d{8,15}$/.test(cleanedWa)) {
      setError(
        "Format nomor WhatsApp tidak valid (contoh: 081234567890 atau +6281234567890)",
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok");
      return;
    }

    if (form.password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }

    setLoading(true);

    try {
      await register(
        form.name,
        form.email,
        form.password,
        form.confirmPassword,
        cleanedWa,
      );
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResendMessage("");
    setResendLoading(true);
    try {
      const data = await resendVerification(form.email);
      setResendMessage(data?.message || "Tautan verifikasi telah dikirim.");
    } catch (err) {
      setError(err.response?.data?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background bg-dot-pattern p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg mx-auto relative z-10 py-6">
        <Card className="glass-panel rounded-2xl shadow-xl border-border/80 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide border border-primary/20 mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>YukNgaji Surabaya</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {success ? "Cek Kotak Masuk Email" : "Buat Akun Baru"}
              </h1>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {success
                  ? "Tautan verifikasi telah dikirim untuk mengaktifkan akunmu"
                  : "Bergabung bersama tim untuk mengelola proyek dan dakwah"}
              </p>
            </div>

            {success ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">Verifikasi Dikirimkan</h3>
                    <p className="text-sm text-muted-foreground">
                      Kami telah mengirim email ke{" "}
                      <span className="font-semibold text-foreground">{form.email}</span>. Silakan periksa inbox atau folder spam kamu.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl border border-destructive/20 font-medium">
                    {error}
                  </div>
                )}
                {resendMessage && (
                  <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl border border-emerald-500/20 font-medium">
                    {resendMessage}
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 rounded-xl text-sm font-medium"
                    onClick={handleResend}
                    disabled={resendLoading}
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Mengirim Ulang...
                      </>
                    ) : (
                      "Kirim Ulang Email Verifikasi"
                    )}
                  </Button>

                  <Button
                    type="button"
                    className="w-full h-11 rounded-xl font-semibold shadow-md gap-2"
                    onClick={() => router.push("/login")}
                  >
                    <span>Lanjut ke Halaman Masuk</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl border border-destructive/20 font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nama Lengkap
                  </Label>
                  <div className="relative">
                    <User className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Nama lengkap kamu"
                      value={form.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                      className="pl-10 h-11 rounded-xl bg-background/50 border-border/70 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="nama@email.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      className="pl-10 h-11 rounded-xl bg-background/50 border-border/70 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nomor WhatsApp
                  </Label>
                  <div className="relative">
                    <Phone className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      id="whatsappNumber"
                      name="whatsappNumber"
                      type="tel"
                      placeholder="081234567890 atau +6281234567890"
                      value={form.whatsappNumber}
                      onChange={handleChange}
                      required
                      autoComplete="tel"
                      className="pl-10 h-11 rounded-xl bg-background/50 border-border/70 focus-visible:ring-primary/30"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Digunakan untuk pengingat tugas dan notifikasi workspace penting.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 8 karakter"
                      value={form.password}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      className="pl-10 pr-10 h-11 rounded-xl bg-background/50 border-border/70 focus-visible:ring-primary/30"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Konfirmasi Password
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Ulangi password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      className="pl-10 pr-10 h-11 rounded-xl bg-background/50 border-border/70 focus-visible:ring-primary/30"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl font-semibold shadow-md gap-2 mt-4 transition-all duration-200 active:scale-[0.99]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Mendaftarkan...</span>
                    </>
                  ) : (
                    <>
                      <span>Daftar Akun</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  Sudah punya akun?{" "}
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                    Masuk di sini
                  </Link>
                </p>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
