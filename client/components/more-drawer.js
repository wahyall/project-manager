"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Columns3,
  History,
  Settings,
  LogOut,
  User,
  Users,
  ChevronRight,
  Download,
  Sparkles,
  Sprout,
  HeartHandshake,
} from "lucide-react";
import { useWorkspace } from "@/contexts/workspace-context";
import { useWorkspaceDivisions } from "@/hooks/use-workspace-divisions";
import { useState, useEffect } from "react";
import { usePushNotification } from "@/hooks/use-push";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Loader2 } from "lucide-react";

export function MoreDrawer({ open, onOpenChange, workspace, workspaceId }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { divisions } = useWorkspaceDivisions(workspaceId);

  const canAccessBM = Boolean(
    (() => {
      const role = workspace?.role || currentWorkspace?.role;
      if (role === "owner" || role === "admin") return true;
      if (!user || !divisions) return false;
      const uid = user._id?.toString() || user.id?.toString();
      const bmDiv = divisions.find(
        (d) =>
          d.divisionType === "bm" ||
          /baitul\s*ma[a]?l|^bm\b|\(bm\)/i.test(d.name)
      );
      if (!bmDiv) return false;
      return (bmDiv.members || []).some((m) => {
        const memberUid =
          typeof m.userId === "object"
            ? m.userId?._id?.toString()
            : m.userId?.toString();
        return memberUid === uid;
      });
    })()
  );

  const [canInstall, setCanInstall] = useState(false);
  const {
    isSubscribed,
    loading: pushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotification();

  useEffect(() => {
    // Check if prompt is already available
    if (window.deferredPrompt) {
      setCanInstall(true);
    }

    // Listen for the custom event from layout.js
    const handleInstallable = () => setCanInstall(true);
    window.addEventListener("pwa-installable", handleInstallable);

    return () =>
      window.removeEventListener("pwa-installable", handleInstallable);
  }, []);

  const handleInstall = async () => {
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) return;

    // Show the install prompt
    promptEvent.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    window.deferredPrompt = null;
    setCanInstall(false);
  };

  const handleNavigate = (href) => {
    onOpenChange(false);
    setTimeout(() => {
      router.push(href);
    }, 150);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-0 pb-safe-area hide-scrollbar max-h-[90vh] overflow-y-auto border-t border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl"
      >
        <SheetHeader className="px-6 pb-2 pt-2">
          <div className="mx-auto h-1 w-12 rounded-full bg-muted-foreground/30 mb-3" />
          <SheetTitle className="text-left font-bold tracking-tight text-lg">Menu Lainnya</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col">
          {/* User Info */}
          <div className="flex items-center gap-3.5 px-6 py-3.5 mx-3 my-1 rounded-2xl bg-muted/40 border border-border/50">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-base shadow-xs ring-1 ring-primary/20">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-xl shrink-0"
              onClick={() =>
                handleNavigate(`/workspace/${workspaceId}/members/${user?._id}`)
              }
            >
              <User className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          <Separator className="my-2 opacity-50" />

          {/* Menus */}
          <div className="px-4 py-2 space-y-1">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Modul Workspace
            </p>

            <Button
              variant="ghost"
              className="w-full justify-between font-medium h-12 rounded-xl hover:bg-muted/70 transition-colors"
              onClick={() => handleNavigate(`/workspace/${workspaceId}/divisions`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Users className="h-4 w-4" />
                </div>
                <span>Divisi Workspace</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </Button>

            {canAccessBM && (
              <Button
                variant="ghost"
                className="w-full justify-between font-medium h-12 rounded-xl hover:bg-muted/70 transition-colors"
                onClick={() => handleNavigate(`/workspace/${workspaceId}/baitul-mal`)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <HeartHandshake className="h-4 w-4" />
                  </div>
                  <span>Baitul Maal (BM)</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-between font-medium h-12 rounded-xl hover:bg-muted/70 transition-colors"
              onClick={() => handleNavigate(`/workspace/${workspaceId}/ideas`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Sprout className="h-4 w-4" />
                </div>
                <span>Bank Ide</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between font-medium h-12 rounded-xl hover:bg-muted/70 transition-colors"
              onClick={() => handleNavigate(`/workspace/${workspaceId}/tasks`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Columns3 className="h-4 w-4" />
                </div>
                <span>Semua Task</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between font-medium h-12 rounded-xl hover:bg-muted/70 transition-colors"
              onClick={() =>
                handleNavigate(`/workspace/${workspaceId}/ai-chat`)
              }
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span>AI Chat Agent</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between font-medium h-12 rounded-xl hover:bg-muted/70 transition-colors"
              onClick={() =>
                handleNavigate(`/workspace/${workspaceId}/activity`)
              }
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <History className="h-4 w-4" />
                </div>
                <span>Activity Log</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </Button>

            <div className="w-full flex items-center justify-between px-3 h-12 rounded-xl transition-colors hover:bg-muted/40">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSubscribed ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}
                >
                  {isSubscribed ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                </div>
                <span className="text-sm font-medium">Notifikasi Push</span>
              </div>
              {pushLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={(checked) => {
                    if (checked) subscribe();
                    else unsubscribe();
                  }}
                />
              )}
            </div>
          </div>

          <Separator className="my-2 opacity-50" />

          <div className="px-4 py-2 space-y-1">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Konfigurasi
            </p>

            <Button
              variant="ghost"
              className="w-full justify-between font-medium h-12 rounded-xl hover:bg-muted/70 transition-colors"
              onClick={() =>
                handleNavigate(`/workspace/${workspaceId}/settings`)
              }
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Settings className="h-4 w-4" />
                </div>
                <span>Pengaturan Workspace</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between font-medium h-12 rounded-xl hover:bg-muted/70 transition-colors"
              onClick={() => handleNavigate(`/settings/account`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
                <span>Pengaturan Akun</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </Button>

            {canInstall && (
              <Button
                variant="ghost"
                className="w-full justify-between font-medium h-12 rounded-xl text-primary hover:text-primary hover:bg-primary/5"
                onClick={handleInstall}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Download className="h-4 w-4" />
                  </div>
                  <span>Install Aplikasi (PWA)</span>
                </div>
                <ChevronRight className="h-4 w-4 text-primary/50" />
              </Button>
            )}
          </div>

          <div className="mt-4 px-6 pb-6">
            <Button
              variant="destructive"
              className="w-full rounded-xl h-11 font-medium shadow-xs"
              onClick={() => {
                onOpenChange(false);
                setTimeout(logout, 200);
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
