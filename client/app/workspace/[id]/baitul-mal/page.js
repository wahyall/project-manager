"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { useWorkspaceDivisions } from "@/hooks/use-workspace-divisions";
import {
  HeartHandshake,
  Crown,
  Wallet,
  Users,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DivisionCashTab } from "@/components/divisions/tracking/division-cash-tab";
import { DivisionInfaqTab } from "@/components/divisions/tracking/division-infaq-tab";
import { DivisionCongregantsTab } from "@/components/divisions/tracking/division-congregants-tab";
import { DivisionIssuesTab } from "@/components/divisions/tracking/division-issues-tab";
import { DivisionReportsTab } from "@/components/divisions/tracking/division-reports-tab";
import { DivisionSpreadsheetTab } from "@/components/divisions/tracking/division-spreadsheet-tab";

export default function BaitulMalPage({ params }) {
  const { id: workspaceId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { currentWorkspace, members, fetchMembers } = useWorkspace();
  const {
    divisions,
    loading: divisionsLoading,
    createDivision,
    fetchDivisions,
  } = useWorkspaceDivisions(workspaceId);

  const [activeTab, setActiveTab] = useState("cash");
  const [initializing, setInitializing] = useState(false);
  const [localBmDivision, setLocalBmDivision] = useState(null);

  useEffect(() => {
    if (workspaceId) {
      fetchMembers(workspaceId);
    }
  }, [workspaceId, fetchMembers]);

  // Cari Divisi Baitul Maal (BM)
  const bmDivision = useMemo(() => {
    if (localBmDivision) return localBmDivision;
    return divisions.find(
      (d) =>
        d.divisionType === "bm" ||
        /baitul\s*ma[a]?l|^bm\b|\(bm\)/i.test(d.name)
    );
  }, [divisions, localBmDivision]);

  // Cek otorisasi: Owner/Admin ATAU Anggota Divisi BM
  const isOwnerOrAdmin = useMemo(() => {
    const role = currentWorkspace?.role;
    return role === "owner" || role === "admin";
  }, [currentWorkspace]);

  const isBmMember = useMemo(() => {
    if (!bmDivision || !user) return false;
    const uid = user._id?.toString() || user.id?.toString();
    return (bmDivision.members || []).some((m) => {
      const memberUid =
        typeof m.userId === "object"
          ? m.userId?._id?.toString()
          : m.userId?.toString();
      return memberUid === uid;
    });
  }, [bmDivision, user]);

  const canAccessBM = isOwnerOrAdmin || isBmMember;
  const canEdit = currentWorkspace?.role !== "guest";

  // Inisialisasi otomatis jika belum ada divisi BM dan user adalah Owner/Admin
  const handleInitializeBM = async () => {
    setInitializing(true);
    try {
      const created = await createDivision({
        name: "Baitul Maal (BM)",
        color: "#10B981",
        description: "Pengelolaan dana kas, infaq anggota, dan data jamaah binaan",
        divisionType: "bm",
      });
      setLocalBmDivision(created);
      await fetchDivisions();
    } catch (err) {
      alert(err.message || "Gagal membuat Divisi Baitul Maal");
    } finally {
      setInitializing(false);
    }
  };

  // State Loading
  if (divisionsLoading && !bmDivision) {
    return (
      <div className="flex min-h-[460px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-xs font-semibold">Memverifikasi hak akses & memuat Baitul Maal...</span>
        </div>
      </div>
    );
  }

  // State: Akses Ditolak (Bukan anggota BM dan bukan Owner/Admin)
  if (!canAccessBM && bmDivision) {
    return (
      <div className="mx-auto max-w-lg p-8 my-14 text-center bg-card/90 backdrop-blur-xs rounded-2xl border border-destructive/20 shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20 shadow-2xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-foreground">Akses Terbatas</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Halaman ini khusus untuk pengurus dan anggota resmi{" "}
            <strong className="text-foreground">Divisi Baitul Maal (BM)</strong> serta Administrator Workspace.
            Kamu tidak memiliki izin untuk melihat modul keuangan dan data jamaah ini.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl text-xs mt-2">
          <Link href={`/workspace/${workspaceId}`}>
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            Kembali ke Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  // State: Divisi BM belum dibuat di workspace
  if (!bmDivision) {
    return (
      <div className="mx-auto max-w-lg p-8 my-14 text-center bg-card/90 backdrop-blur-xs rounded-2xl border border-dashed border-border/80 shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-2xs">
          <HeartHandshake className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-foreground">
            Divisi Baitul Maal Belum Dibuat
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Workspace ini belum memiliki modul divisi khusus Baitul Maal untuk tracking
            keuangan kas, infaq bulanan, kendala jamaah, dan pelaporan keuangan.
          </p>
        </div>

        {isOwnerOrAdmin ? (
          <Button
            onClick={handleInitializeBM}
            disabled={initializing}
            className="gap-2 rounded-xl text-xs h-10 px-6 shadow-xs font-semibold"
          >
            {initializing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyiapkan Divisi...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Inisialisasi Divisi Baitul Maal
              </>
            )}
          </Button>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Hubungi Owner atau Admin workspace untuk mengaktifkan divisi ini.
          </p>
        )}
      </div>
    );
  }

  const leaders = (bmDivision.members || []).filter((m) => m.role === "leader");

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      {/* ── Header Banner ───────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xs p-6 shadow-xs">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pt-1">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                {bmDivision.name}
              </h1>
              <Badge variant="outline" className="text-[10px] font-semibold rounded-full px-2.5 py-0.5 border-border/80">
                {bmDivision.members?.length || 0} Anggota
              </Badge>
              {bmDivision.googleSpreadsheetUrl && (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold rounded-full px-2.5 py-0.5"
                >
                  Google Sheet Terhubung
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 max-w-2xl leading-relaxed">
              {bmDivision.description ||
                "Pusat pencatatan uang kas bulanan, infaq anggota, direktori data jamaah, kendala, dan laporan bulanan Divisi Baitul Maal."}
            </p>
          </div>

          {/* Ketua Divisi Info */}
          <div className="flex items-center gap-3 bg-muted/40 border border-border/70 rounded-xl p-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Ketua Divisi BM
              </span>
              <div className="text-xs font-bold text-foreground truncate max-w-[180px]">
                {leaders.length > 0
                  ? leaders
                      .map((l) => (typeof l.userId === "object" ? l.userId?.name : "User"))
                      .join(", ")
                  : "Belum Ditentukan"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b border-border/60 pb-px">
          <TabsList className="bg-muted/40 p-1 rounded-xl border border-border/60 h-auto inline-flex flex-wrap gap-1">
            <TabsTrigger
              value="cash"
              className="gap-2 text-xs py-2 px-3.5 rounded-lg font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Kas & Keuangan
            </TabsTrigger>
            <TabsTrigger
              value="infaq"
              className="gap-2 text-xs py-2 px-3.5 rounded-lg font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              Infaq Anggota
            </TabsTrigger>
            <TabsTrigger
              value="congregants"
              className="gap-2 text-xs py-2 px-3.5 rounded-lg font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Data Jamaah
            </TabsTrigger>
            <TabsTrigger
              value="issues"
              className="gap-2 text-xs py-2 px-3.5 rounded-lg font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Kendala & Koordinasi
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="gap-2 text-xs py-2 px-3.5 rounded-lg font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Laporan Bulanan
            </TabsTrigger>
            <TabsTrigger
              value="spreadsheet"
              className="gap-2 text-xs py-2 px-3.5 rounded-lg font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Google Spreadsheet
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Kas */}
        <TabsContent value="cash" className="mt-0 focus-visible:outline-none">
          <DivisionCashTab
            workspaceId={workspaceId}
            divisionId={bmDivision._id}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Tab 2: Infaq */}
        <TabsContent value="infaq" className="mt-0 focus-visible:outline-none">
          <DivisionInfaqTab
            workspaceId={workspaceId}
            divisionId={bmDivision._id}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Tab 3: Jamaah */}
        <TabsContent value="congregants" className="mt-0 focus-visible:outline-none">
          <DivisionCongregantsTab
            workspaceId={workspaceId}
            divisionId={bmDivision._id}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Tab 4: Kendala & Koordinasi */}
        <TabsContent value="issues" className="mt-0 focus-visible:outline-none">
          <DivisionIssuesTab
            workspaceId={workspaceId}
            divisionId={bmDivision._id}
            allDivisions={divisions}
            workspaceMembers={members}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Tab 5: Laporan Bulanan */}
        <TabsContent value="reports" className="mt-0 focus-visible:outline-none">
          <DivisionReportsTab
            workspaceId={workspaceId}
            divisionId={bmDivision._id}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Tab 6: Google Spreadsheet */}
        <TabsContent value="spreadsheet" className="mt-0 focus-visible:outline-none">
          <DivisionSpreadsheetTab
            workspaceId={workspaceId}
            divisionId={bmDivision._id}
            division={bmDivision}
            onDivisionUpdated={(updated) => setLocalBmDivision(updated)}
            canEdit={canEdit}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
