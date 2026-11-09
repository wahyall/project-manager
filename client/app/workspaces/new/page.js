"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/protected-route";
import { useWorkspace } from "@/contexts/workspace-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  ShieldCheck,
  Building2,
  CheckCircle2,
  CheckSquare,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export default function NewWorkspacePage() {
  const router = useRouter();
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Preview initials and color
  const initials = name
    .trim()
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    "from-emerald-500 to-teal-600",
    "from-blue-500 to-indigo-600",
    "from-violet-500 to-purple-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-blue-600",
  ];
  const colorIndex =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const gradientColor = name.trim() ? colors[colorIndex] : "from-slate-400 to-slate-500";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const workspace = await createWorkspace({
        name: name.trim(),
        description: description.trim(),
      });
      toast.success(`Workspace "${workspace.name}" berhasil dibuat!`);
      router.push(`/workspace/${workspace._id}/settings`);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal membuat workspace",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[100dvh] bg-background bg-dot-pattern flex flex-col relative overflow-hidden">
        {/* Subtle ambient blur */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar */}
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
          <div className="mx-auto max-w-4xl flex items-center justify-between px-4 sm:px-6 h-16">
            <Link href="/workspaces">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Kembali ke Workspace</span>
              </Button>
            </Link>

            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto max-w-2xl w-full px-4 sm:px-6 py-10 flex-1 relative z-10">
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 shadow-xs ring-1 ring-primary/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Buat Workspace Baru
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Ruang kerja kolaboratif untuk tim kepanitiaan, komunitas, atau divisi.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/95 shadow-xl p-6 sm:p-8 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Live Preview Avatar */}
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${gradientColor} text-white font-black text-2xl shadow-lg ring-4 ring-background transition-all duration-300`}
                  >
                    {initials || <Building2 className="h-8 w-8 text-white/80" />}
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Pratinjau Avatar
                  </span>
                </div>
              </div>

              {/* Workspace Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="name"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Nama Workspace <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {name.length}/50
                  </span>
                </div>
                <Input
                  id="name"
                  type="text"
                  placeholder='contoh: "Panitia Ramadhan 1448H" atau "Tim Media & Dakwah"'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  required
                  autoFocus
                  className="h-11 rounded-xl bg-background/60 border-border/70 focus-visible:ring-primary/30 text-base"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="description"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Deskripsi Singkat{" "}
                    <span className="text-muted-foreground/60 font-normal lowercase">
                      (opsional)
                    </span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {description.length}/500
                  </span>
                </div>
                <Textarea
                  id="description"
                  placeholder="Jelaskan tujuan atau cakupan tugas workspace ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="rounded-xl bg-background/60 border-border/70 focus-visible:ring-primary/30 resize-none text-sm"
                />
              </div>

              {/* Feature Checklist Box */}
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Fitur otomatis yang akan disiapkan:</span>
                </p>
                <ul className="text-xs text-muted-foreground space-y-1.5 pl-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Anda otomatis menjadi <strong>Owner</strong> utama</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>4 kolom kanban bawaan: <em>To Do, In Progress, Review, Selesai</em></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Tautan undangan instan untuk mengundang relawan/panitia</span>
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Link href="/workspaces">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-11 px-5 font-medium"
                  >
                    Batal
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="rounded-xl h-11 px-6 font-semibold shadow-md gap-2 active:scale-[0.98] transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Membuat...</span>
                    </>
                  ) : (
                    <>
                      <span>Buat Workspace</span>
                      <Sparkles className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
