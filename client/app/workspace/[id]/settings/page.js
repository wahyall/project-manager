"use client";

import { use } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Columns3, Tags, Sparkles } from "lucide-react";
import GeneralTab from "./general-tab";
import MembersTab from "./members-tab";
import KanbanTab from "./kanban-tab";
import LabelsTab from "./labels-tab";

export default function WorkspaceSettingsPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace } = useWorkspace();

  if (!currentWorkspace) return null;

  const isAdminOrOwner =
    currentWorkspace.role === "owner" || currentWorkspace.role === "admin";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" />
              Konfigurasi Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-muted/60 border border-border/80 text-foreground">
              <Settings className="h-5 w-5" />
            </div>
            Pengaturan Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Kelola preferensi, akses tim, dan alur kerja untuk{" "}
            <span className="font-semibold text-foreground">
              {currentWorkspace.name}
            </span>
          </p>
        </div>
      </div>

      {/* Settings tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <div className="border-b border-border/60 pb-px">
          <TabsList className="bg-muted/40 p-1 rounded-xl border border-border/60 h-auto inline-flex flex-wrap gap-1">
            <TabsTrigger
              value="general"
              className="gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Settings className="h-4 w-4" />
              <span>Umum</span>
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Users className="h-4 w-4" />
              <span>Member</span>
            </TabsTrigger>
            <TabsTrigger
              value="labels"
              className="gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Tags className="h-4 w-4" />
              <span>Label</span>
            </TabsTrigger>
            {isAdminOrOwner && (
              <TabsTrigger
                value="kanban"
                className="gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                <Columns3 className="h-4 w-4" />
                <span>Kolom Kanban</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="general" className="mt-0 focus-visible:outline-none">
          <GeneralTab
            workspace={currentWorkspace}
            isAdminOrOwner={isAdminOrOwner}
          />
        </TabsContent>

        <TabsContent value="members" className="mt-0 focus-visible:outline-none">
          <MembersTab
            workspace={currentWorkspace}
            isAdminOrOwner={isAdminOrOwner}
          />
        </TabsContent>

        <TabsContent value="labels" className="mt-0 focus-visible:outline-none">
          <LabelsTab workspace={currentWorkspace} />
        </TabsContent>

        {isAdminOrOwner && (
          <TabsContent value="kanban" className="mt-0 focus-visible:outline-none">
            <KanbanTab workspace={currentWorkspace} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
