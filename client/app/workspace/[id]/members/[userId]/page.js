"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Crown,
  ShieldCheck,
  Shield,
  Phone,
  PhoneOff,
  Mail,
  CalendarDays,
  CheckCircle2,
  ListTodo,
  CalendarRange,
  MessageSquare,
  Settings,
  Loader2,
  Building2,
  Activity,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// ─── Role configuration ──────────────────────────────
const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    bgGradient: "from-amber-500/20 via-amber-500/10 to-transparent",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    bgGradient: "from-blue-500/20 via-blue-500/10 to-transparent",
  },
  member: {
    label: "Member",
    icon: Shield,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    bgGradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
  },
  guest: {
    label: "Guest",
    icon: Shield,
    color: "bg-muted text-muted-foreground border-border/60",
    bgGradient: "from-muted/40 via-muted/20 to-transparent",
  },
};

// ─── Stat Card Component ─────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color} shadow-2xs`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      <Card className="rounded-2xl border-border/80">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-48 rounded-lg" />
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MemberProfilePage({ params }) {
  const { id: workspaceId, userId: targetUserId } = use(params);
  const { user: currentUser } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isOwnProfile = currentUser?._id === targetUserId;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, statsRes] = await Promise.all([
          api.get(
            `/workspaces/${workspaceId}/members/${targetUserId}/profile`,
          ),
          api.get(
            `/workspaces/${workspaceId}/members/${targetUserId}/stats`,
          ),
        ]);

        setProfile(profileRes.data.data.profile);
        setStats(statsRes.data.data.stats);
      } catch (err) {
        setError(
          err.response?.data?.message || "Gagal memuat profil member",
        );
        toast.error("Gagal memuat profil member");
      } finally {
        setLoading(false);
      }
    }

    if (workspaceId && targetUserId) {
      fetchData();
    }
  }, [workspaceId, targetUserId]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/80 rounded-2xl bg-card/40">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            {error || "Profil tidak ditemukan"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Pengguna mungkin bukan anggota workspace ini atau akun telah dinonaktifkan.
          </p>
          <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  const roleConfig = ROLE_CONFIG[profile.role] || ROLE_CONFIG.member;
  const RoleIcon = roleConfig.icon;
  const joinedDate = profile.joinedAt
    ? new Date(profile.joinedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-24 md:pb-8">
      {/* Back button & Action */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 text-muted-foreground hover:text-foreground rounded-xl h-9"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>

        {isOwnProfile && (
          <Link href="/settings/account">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl h-9 text-xs shadow-2xs">
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Edit Akun Saya
            </Button>
          </Link>
        )}
      </div>

      {/* Profile hero card */}
      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
        {/* Ambient banner */}
        <div
          className={`h-28 sm:h-36 bg-linear-to-br ${roleConfig.bgGradient} relative border-b border-border/40`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.12),transparent)]" />
        </div>

        <CardContent className="relative pt-0 pb-6 px-6">
          {/* Avatar (overlapping banner) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-14 sm:-mt-12">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-background text-primary font-bold text-3xl ring-4 ring-background shadow-md overflow-hidden border border-border">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                ) : (
                  profile.name?.charAt(0).toUpperCase() || "?"
                )}
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left pb-1 space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {profile.name}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-2xs font-semibold gap-1 rounded-full px-2.5 py-0.5 border ${roleConfig.color}`}
                >
                  <RoleIcon className="h-3 w-3" />
                  {roleConfig.label}
                </Badge>
                {isOwnProfile && (
                  <span className="text-2xs font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    Kamu
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-2xs text-muted-foreground font-medium">Email Kontak</p>
                <p className="text-xs font-semibold text-foreground truncate">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
              {profile.whatsappRegistered ? (
                <>
                  <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-2xs text-muted-foreground font-medium">WhatsApp</p>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Terhubung
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <PhoneOff className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-2xs text-muted-foreground font-medium">WhatsApp</p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Belum terdaftar
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-2xs text-muted-foreground font-medium">Waktu Bergabung</p>
                <p className="text-xs font-semibold text-foreground">{joinedDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Ringkasan Kontribusi
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <StatCard
            icon={CheckCircle2}
            label="Task Selesai"
            value={stats?.tasksCompleted ?? 0}
            color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          />
          <StatCard
            icon={ListTodo}
            label="Task Aktif"
            value={stats?.tasksActive ?? 0}
            color="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
          />
          <StatCard
            icon={CalendarRange}
            label="Event Diikuti"
            value={stats?.eventsParticipated ?? 0}
            color="bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
          />
          <StatCard
            icon={MessageSquare}
            label="Komentar"
            value={stats?.commentsCreated ?? 0}
            color="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
          />
        </div>
      </div>

      {/* Shared workspaces */}
      {profile.sharedWorkspaces && profile.sharedWorkspaces.length > 0 && (
        <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">
                Workspace Bersama
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Ruang kerja kolaboratif yang kamu ikuti bersama{" "}
              {isOwnProfile ? "" : profile.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2.5">
              {profile.sharedWorkspaces.map((ws) => (
                <Tooltip key={ws._id}>
                  <TooltipTrigger asChild>
                    <Link href={`/workspace/${ws._id}`}>
                      <button className="inline-flex items-center gap-2.5 rounded-xl border border-border/80 bg-background/50 px-3.5 py-2 text-xs font-medium hover:border-primary/40 hover:bg-muted/40 transition-all group shadow-2xs">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-2xs font-bold border border-primary/20">
                          {ws.name
                            ?.split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <span className="truncate max-w-[160px] text-foreground">
                          {ws.name}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Buka workspace {ws.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Log Info */}
      <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">
              Aktivitas Member
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Jejak kontribusi member di workspace ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border/70 rounded-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-2">
              <Activity className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground">
              Aktivitas pengguna terintegrasi otomatis di Activity Log workspace.
            </p>
            <Link href={`/workspace/${workspaceId}/activity`} className="mt-3">
              <Button variant="outline" size="sm" className="rounded-xl text-xs h-8">
                Buka Seluruh Activity Log
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
