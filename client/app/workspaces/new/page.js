"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/protected-route";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Loader2, ImagePlus, Sparkles } from "lucide-react";
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
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
    "from-indigo-500 to-blue-600",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-blue-600",
  ];
  const colorIndex = name
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const gradientColor = name.trim() ? colors[colorIndex] : "from-gray-300 to-gray-400";

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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        {/* Topbar */}
        <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl flex items-center px-4 sm:px-6 h-16">
            <Link href="/workspaces">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Buat Workspace Baru
            </h1>
            <p className="text-muted-foreground mt-2">
              Workspace adalah ruang kerja untuk tim kamu. Semua event, task, dan
              board brainstorming akan ada di dalamnya.
            </p>
          </div>

          <Card className="border-2 border-dashed border-border/60 shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Preview */}
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${gradientColor} text-white font-bold text-2xl shadow-lg transition-all duration-300`}
                    >
                      {initials || "?"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Preview logo
                    </p>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nama Workspace <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder='contoh: "Tim Marketing Q1" atau "Proyek Website"'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                    required
                    autoFocus
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {name.length}/50
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Deskripsi{" "}
                    <span className="text-muted-foreground font-normal">
                      (opsional)
                    </span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Jelaskan tujuan workspace ini secara singkat..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length}/500
                  </p>
                </div>

                {/* Info box */}
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Yang akan otomatis dibuat:</strong>
                  </p>
                  <ul className="text-sm text-blue-600 dark:text-blue-400 mt-1 space-y-0.5">
                    <li>
                      &bull; Kamu menjadi <strong>Owner</strong> workspace
                    </li>
                    <li>
                      &bull; 4 kolom kanban default: To Do, In Progress, Review, Done
                    </li>
                    <li>&bull; Tautan undangan untuk mengundang anggota tim</li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Link href="/workspaces">
                    <Button type="button" variant="outline">
                      Batal
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="min-w-[140px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Membuat...
                      </>
                    ) : (
                      "Buat Workspace"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}

