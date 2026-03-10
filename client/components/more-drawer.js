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
  Calendar,
  History,
  Settings,
  LogOut,
  User,
  ChevronRight,
  Download,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { usePushNotification } from "@/hooks/use-push";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Loader2 } from "lucide-react";

export function MoreDrawer({ open, onOpenChange, workspace, workspaceId }) {
  const router = useRouter();
  const { user, logout } = useAuth();

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
        className="rounded-t-2xl px-0 pb-safe-area hide-scrollbar max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="px-5 pb-3">
          <SheetTitle className="text-left font-semibold">Lainnya</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col">
          {/* User Info */}
          <div className="flex items-center gap-3 px-5 py-3 mb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/20">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() =>
                handleNavigate(`/workspace/${workspaceId}/members/${user?._id}`)
              }
            >
              <User className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          <Separator />

          {/* Menus */}
          <div className="px-3 py-3 space-y-1">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Menu Utama
            </p>

            <Button
              variant="ghost"
              className="w-full justify-between font-normal h-12 rounded-xl"
              onClick={() =>
                handleNavigate(`/workspace/${workspaceId}/tasks/calendar`)
              }
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                  <Calendar className="h-4 w-4" />
                </div>
                Kalender View
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between font-normal h-12 rounded-xl"
              onClick={() =>
                handleNavigate(`/workspace/${workspaceId}/ai-chat`)
              }
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                AI Chat
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between font-normal h-12 rounded-xl"
              onClick={() =>
                handleNavigate(`/workspace/${workspaceId}/activity`)
              }
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  <History className="h-4 w-4" />
                </div>
                Activity Log
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </Button>

            <div className="w-full flex items-center justify-between px-3 h-12 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSubscribed ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}
                >
                  {isSubscribed ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                </div>
                <span className="text-sm">Notifikasi Push</span>
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

          <Separator />

          <div className="px-3 py-3 space-y-1">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Pengaturan
            </p>

            <Button
              variant="ghost"
              className="w-full justify-between font-normal h-12 rounded-xl"
              onClick={() =>
                handleNavigate(`/workspace/${workspaceId}/settings`)
              }
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800">
                  <Settings className="h-4 w-4" />
                </div>
                Pengaturan Workspace
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-between font-normal h-12 rounded-xl"
              onClick={() => handleNavigate(`/settings/account`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800">
                  <User className="h-4 w-4" />
                </div>
                Pengaturan Akun
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </Button>

            {canInstall && (
              <Button
                variant="ghost"
                className="w-full justify-between font-normal h-12 rounded-xl text-primary hover:text-primary hover:bg-primary/5"
                onClick={handleInstall}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Download className="h-4 w-4" />
                  </div>
                  Install Aplikasi (PWA)
                </div>
                <ChevronRight className="h-4 w-4 text-primary/50" />
              </Button>
            )}
          </div>

          <div className="mt-4 px-6 pb-6">
            <Button
              variant="destructive"
              className="w-full rounded-xl h-11"
              onClick={() => {
                onOpenChange(false);
                setTimeout(logout, 200);
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
