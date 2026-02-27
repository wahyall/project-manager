"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, LogIn, Mail } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3">
            {status === "loading" || status === "joining" ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : status === "success" ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            ) : status === "needLogin" ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>

          <CardTitle className="text-xl">
            {status === "loading" || status === "joining"
              ? "Memproses Undangan..."
              : status === "success"
                ? "Berhasil Bergabung!"
                : status === "needLogin"
                  ? "Masuk untuk Bergabung"
                  : "Undangan Tidak Valid"}
          </CardTitle>

          <CardDescription className="mt-2">
            {status === "loading" || status === "joining"
              ? "Memverifikasi undangan email..."
              : status === "success"
                ? message
                : status === "needLogin"
                  ? "Kamu perlu masuk terlebih dahulu"
                  : message}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-3">
          {status === "success" && (
            <p className="text-sm text-muted-foreground">
              Mengalihkan ke workspace...
            </p>
          )}

          {status === "needLogin" && (
            <Link
              href={`/login?redirect=/workspaces/join/invite?token=${token}`}
              className="w-full"
            >
              <Button className="w-full gap-2">
                <LogIn className="h-4 w-4" />
                Masuk
              </Button>
            </Link>
          )}

          {status === "error" && (
            <Link href="/workspaces" className="w-full">
              <Button variant="outline" className="w-full">
                Ke Daftar Workspace
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function JoinInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <JoinInviteContent />
    </Suspense>
  );
}

