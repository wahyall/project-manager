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
} from "lucide-react";
import { toast } from "sonner";

const ROLE_COLORS = {
  owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  member:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  guest: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
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

  // Generate a consistent color from workspace name
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
  const colorIndex =
    workspace.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    colors.length;
  const gradientColor = colors[colorIndex];

  return (
    <div
      className="group relative flex flex-col rounded-xl border bg-card transition-all duration-200 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 cursor-pointer"
      onClick={() => router.push(`/workspace/${workspace._id}`)}
    >
      {/* Top gradient strip */}
      <div
        className={`h-2 rounded-t-xl bg-gradient-to-r ${gradientColor}`}
      />

      <div className="flex flex-col gap-4 p-5">
        {/* Header: Logo + Name + Actions */}
        <div className="flex items-start gap-3">
          {/* Logo / Initials */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradientColor} text-white font-bold text-lg shadow-sm`}
          >
            {workspace.logo ? (
              <img
                src={workspace.logo}
                alt={workspace.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-base leading-tight">
              {workspace.name}
            </h3>
            {workspace.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                {workspace.description}
              </p>
            )}
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/workspace/${workspace._id}/settings`)
                }
              >
                <Settings className="h-4 w-4 mr-2" />
                Pengaturan
              </DropdownMenuItem>
              {(workspace.role === "owner" || workspace.role === "admin") && (
                <DropdownMenuItem
                  onClick={() => onArchive(workspace)}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {workspace.isArchived ? "Unarsipkan" : "Arsipkan"}
                </DropdownMenuItem>
              )}
              {workspace.role !== "owner" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onLeave(workspace)}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Keluar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Footer: Stats + Role badge */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {workspace.memberCount || 0}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {workspace.memberCount || 0} member
              </TooltipContent>
            </Tooltip>
          </div>

          <Badge
            variant="secondary"
            className={`text-xs font-medium ${ROLE_COLORS[workspace.role] || ""}`}
          >
            {ROLE_LABELS[workspace.role] || workspace.role}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mb-6">
        <Briefcase className="h-10 w-10 text-primary/60" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        Belum ada workspace
      </h3>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Buat workspace pertamamu untuk mulai mengorganisir proyek, mengundang
        anggota tim, dan berkolaborasi bersama.
      </p>
      <Link href="/workspaces/new">
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Buat Workspace Pertama
        </Button>
      </Link>
    </div>
  );
}

export default function WorkspacesPage() {
  const { user, logout } = useAuth();
  const {
    workspaces,
    loading,
    fetchWorkspaces,
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
    if (
      !confirm(`Yakin ingin keluar dari workspace "${workspace.name}"?`)
    ) {
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        {/* Topbar */}
        <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                YN
              </div>
              <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                Project Manager
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="hidden sm:inline text-sm">
                      {user?.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {user?.name}
                  </div>
                  <div className="px-2 pb-1.5 text-xs text-muted-foreground">
                    {user?.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Workspace
              </h2>
              <p className="text-muted-foreground mt-1">
                Kelola semua workspace yang kamu ikuti
              </p>
            </div>
            {hasWorkspaces && (
              <Link href="/workspaces/new">
                <Button className="gap-2 shadow-sm">
                  <Plus className="h-4 w-4" />
                  Buat Workspace
                </Button>
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !hasWorkspaces ? (
            <EmptyState />
          ) : (
            <div className="space-y-8">
              {/* Active workspaces */}
              {workspaces.active.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Aktif ({workspaces.active.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <section>
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    {showArchived ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Archive className="h-4 w-4" />
                    Diarsipkan ({workspaces.archived.length})
                  </button>
                  {showArchived && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

