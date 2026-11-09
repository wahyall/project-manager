"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Users,
  LayoutGrid,
  Archive,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
  MoreVertical,
  Briefcase,
  Loader2,
  Sparkles,
  ArrowRight,
  User,
  Shield,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

const ROLE_COLORS = {
  owner: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  admin: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  member: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  guest: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
};

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  guest: "Guest",
};

function WorkspaceCard({ workspace, onArchive, onLeave }) {
  const router = useRouter();
  const { user } = useAuth();

  const initials = workspace.name
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
    workspace.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    colors.length;
  const gradientColor = colors[colorIndex];

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-border/80 bg-card/90 hover:bg-card shadow-xs transition-all duration-200 hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 cursor-pointer overflow-hidden backdrop-blur-xs"
      onClick={() => router.push(`/workspace/${workspace._id}`)}
    >
      {/* Decorative top accent line */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradientColor}`} />

      <div className="flex flex-col gap-4 p-5 flex-1 justify-between">
        {/* Header: Logo + Name + Actions */}
        <div className="flex items-start gap-3.5">
          {/* Logo / Initials */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradientColor} text-white font-bold text-base shadow-sm ring-1 ring-white/20`}
          >
            {workspace.logo ? (
              <img
                src={workspace.logo}
                alt={workspace.name}
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-bold text-foreground truncate text-base leading-snug group-hover:text-primary transition-colors">
              {workspace.name}
            </h3>
            {workspace.description ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {workspace.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/60 mt-1 italic">
                Tidak ada deskripsi workspace
              </p>
            )}
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 rounded-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-xl p-1.5 shadow-lg border-border/70"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                className="rounded-lg py-2 text-xs font-medium cursor-pointer"
                onClick={() =>
                  router.push(`/workspace/${workspace._id}/settings`)
                }
              >
                <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
                Pengaturan
              </DropdownMenuItem>
              {(workspace.role === "owner" || workspace.role === "admin") && (
                <DropdownMenuItem
                  className="rounded-lg py-2 text-xs font-medium cursor-pointer"
                  onClick={() => onArchive(workspace)}
                >
                  <Archive className="h-4 w-4 mr-2 text-muted-foreground" />
                  {workspace.isArchived ? "Buka Arsip" : "Arsipkan"}
                </DropdownMenuItem>
              )}
              {workspace.role !== "owner" && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-2 text-xs font-medium cursor-pointer"
                    onClick={() => onLeave(workspace)}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Keluar dari Workspace
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Footer: Stats + Role badge */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">
              {workspace.memberCount || 0}
            </span>
            <span className="text-muted-foreground">anggota</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[workspace.role] || ""}`}
            >
              {ROLE_LABELS[workspace.role] || workspace.role}
            </Badge>
            <span className="text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-0.5 duration-200">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 shadow-xs ring-1 ring-primary/20">
        <Briefcase className="h-10 w-10" />
      </div>
      <h3 className="text-2xl font-bold text-foreground mb-2">
        Belum ada workspace
      </h3>
      <p className="text-muted-foreground text-center max-w-md mb-8 text-sm leading-relaxed">
        Buat workspace pertamamu untuk mulai mengorganisir kepanitiaan, mengundang relawan tim, membagikan task kanban, dan mencatat kas Baitul Maal.
      </p>
      <Link href="/workspaces/new">
        <Button size="lg" className="gap-2 rounded-xl shadow-md font-semibold px-6">
          <Plus className="h-5 w-5" />
          Buat Workspace Pertama
        </Button>
      </Link>
    </div>
  );
}

export default function WorkspacesPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const {
    workspaces,
    loading,
    archiveWorkspace,
    unarchiveWorkspace,
    leaveWorkspace,
  } = useWorkspace();
  const [showArchived, setShowArchived] = useState(false);

  const handleArchive = async (workspace) => {
    try {
      if (workspace.isArchived) {
        await unarchiveWorkspace(workspace._id);
        toast.success(`"${workspace.name}" berhasil diunarsipkan`);
      } else {
        await archiveWorkspace(workspace._id);
        toast.success(`"${workspace.name}" berhasil diarsipkan`);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal mengarsipkan workspace",
      );
    }
  };

  const handleLeave = async (workspace) => {
    if (!confirm(`Yakin ingin keluar dari workspace "${workspace.name}"?`)) {
      return;
    }
    try {
      await leaveWorkspace(workspace._id);
      toast.success(`Berhasil keluar dari "${workspace.name}"`);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal keluar dari workspace",
      );
    }
  };

  const hasWorkspaces =
    workspaces.active.length > 0 || workspaces.archived.length > 0;

  return (
    <ProtectedRoute>
      <div className="min-h-[100dvh] bg-background bg-dot-pattern flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
          <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold flex items-center justify-center text-sm shadow-xs ring-1 ring-primary/20">
                YN
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground tracking-tight">
                  YukNgaji Surabaya
                </h1>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  Pusat Kolaborasi Workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2.5 rounded-xl h-9 px-2 hover:bg-accent/80 transition-colors"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-foreground">
                      {user?.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-lg border-border/70">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => router.push("/settings/account")}
                    className="rounded-lg py-2 text-xs font-medium cursor-pointer"
                  >
                    <Settings className="h-4 w-4 mr-2.5 text-muted-foreground" />
                    Pengaturan Akun
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-2 text-xs font-medium cursor-pointer"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4 mr-2.5" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-8 flex-1">
          {/* Header area */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Pilih Workspace</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Ruang Kerja Anda
              </h2>
              <p className="text-sm text-muted-foreground">
                Kelola kepengurusan, divisi, dan proyek di mana kamu tergabung
              </p>
            </div>

            {hasWorkspaces && (
              <Link href="/workspaces/new">
                <Button className="gap-2 rounded-xl font-semibold shadow-md h-10 px-4 active:scale-[0.98] transition-all">
                  <Plus className="h-4 w-4" />
                  <span>Buat Workspace Baru</span>
                </Button>
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Memuat daftar workspace...</p>
            </div>
          ) : !hasWorkspaces ? (
            <EmptyState />
          ) : (
            <div className="space-y-10">
              {/* Active workspaces */}
              {workspaces.active.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Workspace Aktif ({workspaces.active.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {workspaces.active.map((ws) => (
                      <WorkspaceCard
                        key={ws._id}
                        workspace={ws}
                        onArchive={handleArchive}
                        onLeave={handleLeave}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Archived workspaces */}
              {workspaces.archived.length > 0 && (
                <section className="pt-4 border-t border-border/60">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="flex items-center gap-2 mb-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors p-1"
                  >
                    {showArchived ? (
                      <ChevronDown className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-primary" />
                    )}
                    <Archive className="h-4 w-4" />
                    <span>Workspace Diarsipkan ({workspaces.archived.length})</span>
                  </button>
                  {showArchived && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                      {workspaces.archived.map((ws) => (
                        <WorkspaceCard
                          key={ws._id}
                          workspace={ws}
                          onArchive={handleArchive}
                          onLeave={handleLeave}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
