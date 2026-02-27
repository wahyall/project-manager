"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Users, CheckCircle2, XCircle, LogIn } from "lucide-react";
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
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            ) : status === "needLogin" ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>

          <CardTitle className="text-xl">
            {status === "loading" || status === "joining"
              ? "Bergabung ke Workspace..."
              : status === "success"
                ? "Berhasil Bergabung!"
                : status === "needLogin"
                  ? "Masuk untuk Bergabung"
                  : "Gagal Bergabung"}
          </CardTitle>

          <CardDescription className="mt-2">
            {status === "loading" || status === "joining" ? (
              "Memproses tautan undangan..."
            ) : status === "success" ? (
              <>
                {message}
                {workspaceName && (
                  <span className="block mt-1 font-medium text-foreground">
                    {workspaceName}
                  </span>
                )}
              </>
            ) : status === "needLogin" ? (
              "Kamu perlu masuk terlebih dahulu untuk bergabung ke workspace"
            ) : (
              message
            )}
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
              href={`/login?redirect=/workspaces/join/${inviteCode}`}
              className="w-full"
            >
              <Button className="w-full gap-2">
                <LogIn className="h-4 w-4" />
                Masuk
              </Button>
            </Link>
          )}

          {status === "error" && (
            <div className="flex gap-3 w-full">
              <Link href="/workspaces" className="flex-1">
                <Button variant="outline" className="w-full">
                  Ke Daftar Workspace
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

