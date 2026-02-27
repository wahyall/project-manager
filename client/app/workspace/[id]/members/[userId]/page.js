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
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    bgGradient: "from-amber-500/10 to-amber-500/5",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    bgGradient: "from-blue-500/10 to-blue-500/5",
  },
  member: {
    label: "Member",
    icon: Shield,
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    bgGradient: "from-emerald-500/10 to-emerald-500/5",
  },
  guest: {
    label: "Guest",
    icon: Shield,
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    bgGradient: "from-gray-500/10 to-gray-500/5",
  },
};

// ─── Stat Card Component ─────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-40" />
      </div>
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════
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
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {error || "Profil tidak ditemukan"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            User mungkin bukan member workspace ini atau telah dihapus.
          </p>
          <Button variant="outline" onClick={() => router.back()}>
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
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>

        {isOwnProfile && (
          <Link href="/settings/account">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-3.5 w-3.5" />
              Edit Profil
            </Button>
          </Link>
        )}
      </div>

      {/* Profile card */}
      <Card className="overflow-hidden">
        {/* Gradient banner */}
        <div
          className={`h-24 sm:h-32 bg-linear-to-r ${roleConfig.bgGradient} relative`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
        </div>

        <CardContent className="relative pt-0 pb-6">
          {/* Avatar (overlapping banner) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-10">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-background text-primary font-bold text-3xl ring-4 ring-background shadow-lg overflow-hidden">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  profile.name?.charAt(0).toUpperCase() || "?"
                )}
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left pb-1">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  {profile.name}
                </h1>
                <Badge
                  variant="secondary"
                  className={`text-xs font-medium gap-1 ${roleConfig.color}`}
                >
                  <RoleIcon className="h-3 w-3" />
                  {roleConfig.label}
                </Badge>
                {isOwnProfile && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Kamu
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">
                {profile.email}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              {profile.whatsappRegistered ? (
                <>
                  <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400">
                    WhatsApp terdaftar
                  </span>
                </>
              ) : (
                <>
                  <PhoneOff className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    WhatsApp belum terdaftar
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                Bergabung {joinedDate}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ringkasan Kontribusi
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={CheckCircle2}
            label="Task Selesai"
            value={stats?.tasksCompleted ?? 0}
            color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          />
          <StatCard
            icon={ListTodo}
            label="Task Aktif"
            value={stats?.tasksActive ?? 0}
            color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          />
          <StatCard
            icon={CalendarRange}
            label="Event Diikuti"
            value={stats?.eventsParticipated ?? 0}
            color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
          />
          <StatCard
            icon={MessageSquare}
            label="Komentar"
            value={stats?.commentsCreated ?? 0}
            color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          />
        </div>
      </div>

      {/* Shared workspaces */}
      {profile.sharedWorkspaces && profile.sharedWorkspaces.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                Workspace Bersama
              </CardTitle>
            </div>
            <CardDescription>
              Workspace yang kamu ikuti bersama{" "}
              {isOwnProfile ? "" : profile.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.sharedWorkspaces.map((ws) => (
                <Tooltip key={ws._id}>
                  <TooltipTrigger asChild>
                    <Link href={`/workspace/${ws._id}`}>
                      <button className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors group">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold">
                          {ws.name
                            ?.split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <span className="truncate max-w-[150px]">
                          {ws.name}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Buka workspace</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity placeholder */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">
              Aktivitas Terkini
            </CardTitle>
          </div>
          <CardDescription>
            Riwayat aktivitas di workspace ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Riwayat aktivitas akan tersedia setelah Activity Log
              diimplementasikan.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

