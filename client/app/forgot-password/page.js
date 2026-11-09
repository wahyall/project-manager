"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background bg-dot-pattern p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        <Card className="glass-panel rounded-2xl shadow-xl border-border/80 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 shadow-xs">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Lupa Password
              </h1>
              <p className="text-sm text-muted-foreground">
                Masukkan email akunmu untuk menerima tautan pemulihan kata sandi
              </p>
            </div>

            {success ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">Email Terkirim!</h3>
                    <p className="text-sm text-muted-foreground">
                      Jika email terdaftar, tautan reset password telah dikirimkan. Silakan cek inbox atau folder spam kamu.
                    </p>
                  </div>
                </div>

                <Button asChild className="w-full h-11 rounded-xl font-semibold shadow-md gap-2">
                  <Link href="/login">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Kembali ke Halaman Masuk</span>
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl border border-destructive/20 font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email Terdaftar
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
                      className="pl-10 h-11 rounded-xl bg-background/50 border-border/70 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl font-semibold shadow-md gap-2 mt-2 transition-all duration-200 active:scale-[0.99]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Mengirim Tautan...</span>
                    </>
                  ) : (
                    <>
                      <span>Kirim Tautan Reset</span>
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
