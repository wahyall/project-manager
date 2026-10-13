"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/contexts/workspace-context";
import { useWorkspaceDivisions } from "@/hooks/use-workspace-divisions";
import {
  ArrowLeft,
  Crown,
  Users,
  Wallet,
  HeartHandshake,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Building2,
  Loader2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { DivisionCashTab } from "@/components/divisions/tracking/division-cash-tab";
import { DivisionInfaqTab } from "@/components/divisions/tracking/division-infaq-tab";
import { DivisionCongregantsTab } from "@/components/divisions/tracking/division-congregants-tab";
import { DivisionIssuesTab } from "@/components/divisions/tracking/division-issues-tab";
import { DivisionReportsTab } from "@/components/divisions/tracking/division-reports-tab";
import { DivisionSpreadsheetTab } from "@/components/divisions/tracking/division-spreadsheet-tab";

export default function DivisionDetailPage({ params }) {
  const { id: workspaceId, divisionId } = use(params);
  const { currentWorkspace, members, fetchMembers } = useWorkspace();
  const {
    divisions,
    loading: divisionsLoading,
    fetchDivisions,
  } = useWorkspaceDivisions(workspaceId);

  const [activeTab, setActiveTab] = useState("cash");
  const [localDivision, setLocalDivision] = useState(null);

  useEffect(() => {
    if (workspaceId) {
      fetchMembers(workspaceId);
    }
  }, [workspaceId, fetchMembers]);

  const division =
    localDivision || divisions.find((d) => d._id === divisionId);

  // Leader(s)
  const leaders = (division?.members || []).filter((m) => m.role === "leader");
  const canEdit = currentWorkspace?.role !== "guest";

  if (divisionsLoading && !division) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Memuat detail divisi...</span>
        </div>
      </div>
    );
  }

  if (!division && !divisionsLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center space-y-4">
        <h2 className="text-xl font-bold">Divisi Tidak Ditemukan</h2>
        <p className="text-sm text-muted-foreground">
          Divisi dengan ID ini tidak ada atau telah dihapus.
        </p>
        <Button asChild variant="outline">
          <Link href={`/workspace/${workspaceId}/divisions`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar Divisi
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">
      {/* ── Breadcrumb & Back ───────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href={`/workspace/${workspaceId}/divisions`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Daftar Divisi
        </Link>
        <span className="text-xs text-muted-foreground">
          Workspace: <span className="font-semibold text-foreground">{currentWorkspace?.name}</span>
        </span>
      </div>

      {/* ── Division Header Banner ──────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: division?.color || "#10b981" }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: division?.color || "#10b981" }}
              />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                {division?.name}
              </h1>
              <Badge variant="secondary" className="font-medium text-xs">
                {division?.members?.length || 0} Anggota
              </Badge>
              {division?.googleSpreadsheetUrl && (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold"
                >
                  Sheet Terhubung
                </Badge>
              )}
            </div>

            {division?.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">
                {division.description}
              </p>
            )}
          </div>

          {/* Ketua Divisi Info */}
          <div className="flex items-center gap-3 bg-muted/40 border border-border/60 rounded-xl p-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Ketua Divisi
              </span>
              <div className="text-sm font-bold text-foreground truncate">
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
        <div className="overflow-x-auto pb-1">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-auto flex flex-wrap sm:inline-flex w-full sm:w-auto">
            <TabsTrigger
              value="cash"
              className="gap-2 text-xs sm:text-sm py-2 px-3.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              Kas & Keuangan
            </TabsTrigger>
            <TabsTrigger
              value="infaq"
              className="gap-2 text-xs sm:text-sm py-2 px-3.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <HeartHandshake className="w-4 h-4 text-sky-600" />
              Infaq Anggota
            </TabsTrigger>
            <TabsTrigger
              value="congregants"
              className="gap-2 text-xs sm:text-sm py-2 px-3.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <Users className="w-4 h-4 text-purple-600" />
              Data Jamaah
            </TabsTrigger>
            <TabsTrigger
              value="issues"
              className="gap-2 text-xs sm:text-sm py-2 px-3.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Kendala & Koordinasi
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="gap-2 text-xs sm:text-sm py-2 px-3.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              Laporan Bulanan
            </TabsTrigger>
            <TabsTrigger
              value="spreadsheet"
              className="gap-2 text-xs sm:text-sm py-2 px-3.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Google Spreadsheet
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Kas */}
        <TabsContent value="cash" className="mt-0">
          <DivisionCashTab
            workspaceId={workspaceId}
            divisionId={divisionId}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Tab 2: Infaq */}
        <TabsContent value="infaq" className="mt-0">
          <DivisionInfaqTab
            workspaceId={workspaceId}
            divisionId={divisionId}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Tab 3: Jamaah */}
        <TabsContent value="congregants" className="mt-0">
          <DivisionCongregantsTab
            workspaceId={workspaceId}
            divisionId={divisionId}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Tab 4: Kendala & Koordinasi */}
        <TabsContent value="issues" className="mt-0">
          <DivisionIssuesTab
            workspaceId={workspaceId}
            divisionId={divisionId}
            allDivisions={divisions}
            workspaceMembers={members}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Tab 5: Laporan Bulanan */}
        <TabsContent value="reports" className="mt-0">
          <DivisionReportsTab
            workspaceId={workspaceId}
            divisionId={divisionId}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Tab 6: Google Spreadsheet */}
        <TabsContent value="spreadsheet" className="mt-0">
          <DivisionSpreadsheetTab
            workspaceId={workspaceId}
            divisionId={divisionId}
            division={division}
            onDivisionUpdated={(updated) => setLocalDivision(updated)}
            canEdit={canEdit}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
