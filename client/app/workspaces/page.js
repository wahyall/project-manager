"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Search,
  CheckSquare,
  Calendar,
  Wallet,
  Compass,
  Building2,
  UserCheck,
  Shield,
  Layers,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";

const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
    icon: Shield,
  },
  admin: {
    label: "Admin",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25",
    icon: Shield,
  },
  member: {
    label: "Member",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
    icon: UserCheck,
  },
  guest: {
    label: "Tamu",
    badge: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/25",
    icon: Users,
  },
};

function WorkspaceCard({ workspace, onArchive, onLeave }) {
  const router = useRouter();

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

  const roleInfo = ROLE_CONFIG[workspace.role] || ROLE_CONFIG.member;
  const RoleIcon = roleInfo.icon;

  const handleNavigate = (path) => (e) => {
    e.stopPropagation();
    router.push(path);
  };

  return (
    <div
      onClick={() => router.push(`/workspace/${workspace._id}`)}
      className="group relative flex flex-col rounded-2xl border border-border/80 bg-card/90 hover:bg-card shadow-xs transition-all duration-200 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 cursor-pointer overflow-hidden backdrop-blur-xs"
    >
      {/* Decorative top accent gradient line */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradientColor}`} />

      <div className="flex flex-col gap-4 p-5 flex-1 justify-between">
        {/* Header: Logo + Title + Menu */}
        <div className="flex items-start gap-3.5">
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
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground truncate text-base leading-snug group-hover:text-primary transition-colors">
                {workspace.name}
              </h3>
            </div>
            {workspace.description ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {workspace.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/50 mt-1 italic">
                Workspace operasional & koordinasi
              </p>
            )}
          </div>

          {/* Quick Dropdown Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity shrink-0 rounded-lg hover:bg-accent"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-xl p-1.5 shadow-lg border-border/70 w-48"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                className="rounded-lg py-2 text-xs font-medium cursor-pointer"
                onClick={() => router.push(`/workspace/${workspace._id}/settings`)}
              >
                <Settings className="h-4 w-4 mr-2.5 text-muted-foreground" />
                Pengaturan Workspace
              </DropdownMenuItem>
              {(workspace.role === "owner" || workspace.role === "admin") && (
                <DropdownMenuItem
                  className="rounded-lg py-2 text-xs font-medium cursor-pointer"
                  onClick={() => onArchive(workspace)}
                >
                  <Archive className="h-4 w-4 mr-2.5 text-muted-foreground" />
                  {workspace.isArchived ? "Buka Arsip" : "Arsipkan Workspace"}
                </DropdownMenuItem>
              )}
              {workspace.role !== "owner" && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-2 text-xs font-medium cursor-pointer"
                    onClick={() => onLeave(workspace)}
                  >
                    <LogOut className="h-4 w-4 mr-2.5" />
                    Keluar dari Workspace
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick jump pills directly on card */}
        <div className="flex items-center gap-1.5 pt-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleNavigate(`/workspace/${workspace._id}/tasks`)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary text-[11px] font-medium text-muted-foreground transition-all duration-150"
              >
                <CheckSquare className="h-3 w-3" />
                <span>Tasks</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Kanban & List Tugas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleNavigate(`/workspace/${workspace._id}/events`)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary text-[11px] font-medium text-muted-foreground transition-all duration-150"
              >
                <Calendar className="h-3 w-3" />
                <span>Events</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Agenda & Kegiatan
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleNavigate(`/workspace/${workspace._id}/baitul-mal`)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary text-[11px] font-medium text-muted-foreground transition-all duration-150"
              >
                <Wallet className="h-3 w-3" />
                <span>Baitul Maal</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Arus Kas & Donasi
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Footer: Stats + Role badge */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">
              {workspace.memberCount || 0}
            </span>
            <span>anggota tim</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${roleInfo.badge}`}
            >
              <RoleIcon className="h-3 w-3" />
              <span>{roleInfo.label}</span>
            </Badge>
            <span className="text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1 duration-200">
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
        <Building2 className="h-10 w-10" />
      </div>
      <h3 className="text-2xl font-bold text-foreground mb-2">
        Belum ada workspace
      </h3>
      <p className="text-muted-foreground text-center max-w-md mb-8 text-sm leading-relaxed">
        Buat workspace pertamamu untuk mulai mengorganisir kepanitiaan, membagikan task kanban, koordinasi event, dan mencatat kas Baitul Maal.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/workspaces/new">
          <Button size="lg" className="gap-2 rounded-xl shadow-md font-semibold px-6">
            <Plus className="h-5 w-5" />
            Buat Workspace Pertama
          </Button>
        </Link>
      </div>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

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

  // Filtered active workspaces
  const filteredActiveWorkspaces = useMemo(() => {
    return (workspaces.active || []).filter((ws) => {
      const matchesSearch =
        ws.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole =
        roleFilter === "all" ? true : ws.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [workspaces.active, searchQuery, roleFilter]);

  const totalMembers = useMemo(() => {
    return (workspaces.active || []).reduce(
      (acc, ws) => acc + (ws.memberCount || 0),
      0,
    );
  }, [workspaces.active]);

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
                <h1 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <span>YukNgaji Surabaya</span>
                  <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider py-0 px-1.5 border-primary/30 text-primary bg-primary/5">
                    Hub
                  </Badge>
                </h1>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  Pusat Kolaborasi Workspace & Program
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />

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
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-xl p-1.5 shadow-lg border-border/70"
                >
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => router.push("/settings/account")}
                    className="rounded-lg py-2 text-xs font-medium cursor-pointer"
                  >
                    <Settings className="h-4 w-4 mr-2.5 text-muted-foreground" />
                    Pengaturan Profil & Sandi
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-2 text-xs font-medium cursor-pointer"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4 mr-2.5" />
                    Keluar (Logout)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-8 flex-1">
          {/* Hero Header Area */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Command Center</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Ruang Kerja & Proyek Anda
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                Akses semua kepengurusan, divisi, kanban task, dan pembukuan kas dalam satu dasbor terpusat.
              </p>
            </div>

            {hasWorkspaces && (
              <div className="flex items-center gap-3">
                <Link href="/workspaces/new">
                  <Button className="gap-2 rounded-xl font-semibold shadow-md h-10 px-4 active:scale-[0.98] transition-all">
                    <Plus className="h-4 w-4" />
                    <span>Buat Workspace</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Metrics Strip */}
          {hasWorkspaces && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl border border-border/80 bg-card/70 p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Workspace Aktif
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {workspaces.active.length}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card/70 p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Relasi Tim
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {totalMembers}
                  </p>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/80 bg-card/70 p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Owner / Pengelola
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {
                      workspaces.active.filter(
                        (w) => w.role === "owner" || w.role === "admin",
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search & Role Filter Bar */}
          {hasWorkspaces && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Cari workspace..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-card/80 border-border/70 text-sm"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                {[
                  { id: "all", label: "Semua" },
                  { id: "owner", label: "Owner" },
                  { id: "admin", label: "Admin" },
                  { id: "member", label: "Member" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setRoleFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                      roleFilter === tab.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Workspace Listing */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">
                Memuat daftar workspace...
              </p>
            </div>
          ) : !hasWorkspaces ? (
            <EmptyState />
          ) : (
            <div className="space-y-10">
              {/* Active workspaces grid */}
              {filteredActiveWorkspaces.length > 0 ? (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Workspace Aktif ({filteredActiveWorkspaces.length})
                      </h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredActiveWorkspaces.map((ws) => (
                      <WorkspaceCard
                        key={ws._id}
                        workspace={ws}
                        onArchive={handleArchive}
                        onLeave={handleLeave}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <div className="py-12 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20">
                  <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">
                    Tidak ditemukan workspace yang sesuai
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coba ubah kata kunci pencarian atau bersihkan filter peran.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setRoleFilter("all");
                    }}
                    className="mt-3 text-xs"
                  >
                    Reset Filter
                  </Button>
                </div>
              )}

              {/* Archived workspaces section */}
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
