"use client";

import { use } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Columns3 } from "lucide-react";
import GeneralTab from "./general-tab";
import MembersTab from "./members-tab";
import KanbanTab from "./kanban-tab";

export default function WorkspaceSettingsPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace } = useWorkspace();

  if (!currentWorkspace) return null;

  const isAdminOrOwner =
    currentWorkspace.role === "owner" || currentWorkspace.role === "admin";

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-500" />
          Pengaturan
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola pengaturan workspace{" "}
          <span className="font-medium text-foreground">
            {currentWorkspace.name}
          </span>
        </p>
      </div>

      {/* Settings tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Umum</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Member</span>
          </TabsTrigger>
          {isAdminOrOwner && (
            <TabsTrigger value="kanban" className="gap-2">
              <Columns3 className="h-4 w-4" />
              <span className="hidden sm:inline">Kolom Kanban</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general">
          <GeneralTab
            workspace={currentWorkspace}
            isAdminOrOwner={isAdminOrOwner}
          />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab
            workspace={currentWorkspace}
            isAdminOrOwner={isAdminOrOwner}
          />
        </TabsContent>

        {isAdminOrOwner && (
          <TabsContent value="kanban">
            <KanbanTab workspace={currentWorkspace} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
