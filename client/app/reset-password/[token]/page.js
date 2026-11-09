"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Loader2, KeyRound, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const params = useParams();
  const token = params.token;

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

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
      await resetPassword(token, form.password, form.confirmPassword);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Token tidak valid atau sudah expired.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background bg-dot-pattern p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        <Card className="rounded-2xl border border-border/80 bg-card/85 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 shadow-xs ring-1 ring-primary/20">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Reset Password
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Buat kata sandi baru yang kuat untuk mengamankan akun kamu
              </p>
            </div>

            {success ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground">Password Berhasil Diperbarui!</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Mengalihkan kamu ke halaman login dalam beberapa detik...
                    </p>
                  </div>
                </div>

                <Button asChild className="w-full h-11 rounded-xl font-semibold shadow-md gap-2 active:scale-[0.98] transition-all">
                  <Link href="/login">
                    <span>Masuk Sekarang</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-xs px-3.5 py-3 rounded-xl border border-destructive/20 font-medium">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password Baru
                  </Label>
                  <div className="relative">
                    <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Minimal 8 karakter"
                      value={form.password}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      className="pl-10 h-11 rounded-xl bg-background/50 border-border/80 focus-visible:ring-primary/25 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Konfirmasi Password Baru
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Ulangi password baru"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      className="pl-10 h-11 rounded-xl bg-background/50 border-border/80 focus-visible:ring-primary/25 text-sm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl font-semibold shadow-md gap-2 mt-4 transition-all duration-200 active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Kembali ke login</span>
                  </Link>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
