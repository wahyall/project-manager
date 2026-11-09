"use client";

import { useEffect, useState, use, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { getApiUrl, onServerSwitch } from "@/lib/server-manager";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "sonner";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { MoreDrawer } from "@/components/more-drawer";
import { ThemeToggle } from "@/components/theme-toggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { CopilotKit } from "@copilotkit/react-core";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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
  Bell,
  LogOut,
  ChevronLeft,
  Loader2,
  Settings,
  User,
  Shield,
  Crown,
} from "lucide-react";

// ─── Topbar Component ───────────────────────────────
function Topbar({ workspace, workspaceId }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const id = workspaceId;

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsHook = useNotifications();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2.5 border-b border-border/70 bg-background/80 backdrop-blur-md px-4 sm:px-6 transition-colors">
      {/* Sidebar trigger */}
      <SidebarTrigger className="-ml-1 hover:bg-muted/80 rounded-xl h-8.5 w-8.5 transition-colors border border-border/60 shadow-2xs" />
      <Separator orientation="vertical" className="mr-1 h-4 opacity-50" />

      {/* Workspace title breadcrumb snippet */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-bold text-sm tracking-tight text-foreground truncate max-w-[200px]">
          {workspace?.name}
        </span>
        {workspace?.isArchived && (
          <span className="text-2xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Diarsipkan
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ThemeToggle />

        {/* Notification bell */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8.5 w-8.5 relative rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
              onClick={() => setIsNotificationsOpen(true)}
            >
              <Bell className="h-4 w-4" />
              {notificationsHook.unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 ring-2 ring-background"></span>
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifikasi Aktivitas</TooltipContent>
        </Tooltip>

        <NotificationPanel
          open={isNotificationsOpen}
          onOpenChange={setIsNotificationsOpen}
          notificationsHook={notificationsHook}
        />

        <Separator orientation="vertical" className="h-4 mx-1 opacity-50 hidden sm:block" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 pl-1.5 pr-2.5 py-1 h-8.5 rounded-xl hover:bg-muted/70 transition-colors border border-border/60 shadow-2xs"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-2xs font-bold ring-1 ring-primary/20 overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || "U"
                )}
              </div>
              <span className="hidden md:inline text-xs font-semibold max-w-[130px] truncate text-foreground">
                {user?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-border/70 bg-card/95 backdrop-blur-md">
            <div className="px-3 py-2 space-y-0.5">
              <p className="text-xs font-bold text-foreground truncate">{user?.name}</p>
              <p className="text-2xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem
              onClick={() => router.push("/settings/account")}
              className="rounded-xl py-2 text-xs font-medium cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2.5 text-muted-foreground" />
              Pengaturan Akun
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/workspaces")}
              className="rounded-xl py-2 text-xs font-medium cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 mr-2.5 text-muted-foreground" />
              Ganti Workspace
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem
              onClick={logout}
              className="rounded-xl py-2 text-xs font-medium text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2.5" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ─── Workspace Layout ───────────────────────────────
export default function WorkspaceLayout({ children, params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { currentWorkspace, setCurrentWorkspace, fetchWorkspace, loading } =
    useWorkspace();
  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const isMobile = useIsMobile();

  const [apiBaseUrl, setApiBaseUrl] = useState(() =>
    getApiUrl().replace(/\/$/, ""),
  );

  useEffect(() => {
    return onServerSwitch(({ apiUrl }) =>
      setApiBaseUrl((apiUrl || "").replace(/\/$/, "")),
    );
  }, []);

  const copilotRuntimeUrl = useMemo(() => {
    return `${apiBaseUrl}/workspaces/${id}/copilotkit`;
  }, [apiBaseUrl, id]);

  const copilotHeaders = useMemo(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const handleCopilotError = useCallback((error) => {
    const msg =
      error?.message ||
      error?.error?.message ||
      error?.context?.message ||
      String(error);
    if (
      msg.includes("quota") ||
      msg.includes("Quota exceeded") ||
      msg.includes("exceeded your current quota")
    ) {
      toast.error("Kuota API telah habis. Periksa billing atau coba lagi nanti.");
    } else if (
      msg.includes("429") ||
      msg.includes("rate") ||
      msg.includes("limit")
    ) {
      toast.error("Batas penggunaan tercapai. Coba lagi nanti.");
    } else {
      toast.error("Terjadi kesalahan pada AI Chat. Silakan coba lagi.");
    }
  }, []);

  // Load workspace data
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setPageLoading(true);
        const ws = await fetchWorkspace(id);
        if (isMounted) {
          if (!ws) {
            setNotFound(true);
          } else {
            await setCurrentWorkspace(ws);
          }
        }
      } catch (err) {
        if (isMounted) {
          if (err.response?.status === 404 || err.response?.status === 403) {
            setNotFound(true);
          } else {
            toast.error("Gagal memuat workspace");
          }
        }
      } finally {
        if (isMounted) {
          setPageLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [id, fetchWorkspace, setCurrentWorkspace]);

  // Connect socket and handle workspace events
  useEffect(() => {
    if (!currentWorkspace || currentWorkspace._id !== id) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    if (!token) return;

    const socket = connectSocket(token);
    if (socket) {
      socket.emit("workspace:join", id);
    }

    const handleWorkspaceUpdated = (updatedWs) => {
      if (updatedWs._id === id) {
        setCurrentWorkspace((prev) => ({ ...prev, ...updatedWs }));
      }
    };

    const handleWorkspaceDeleted = ({ workspaceId }) => {
      if (workspaceId === id) {
        toast.error("Workspace ini telah dihapus oleh pemiliknya");
        router.push("/workspaces");
      }
    };

    const handleMemberRemoved = ({ workspaceId, userId }) => {
      if (workspaceId === id && userId === user?._id) {
        toast.error("Kamu telah dikeluarkan dari workspace ini");
        router.push("/workspaces");
      }
    };

    socket.on("workspace:updated", handleWorkspaceUpdated);
    socket.on("workspace:deleted", handleWorkspaceDeleted);
    socket.on("workspace:member:removed", handleMemberRemoved);

    const unsubscribe = onServerSwitch(() => {
      disconnectSocket();
      const s = connectSocket(token);
      if (s) s.emit("workspace:join", id);
    });

    return () => {
      if (socket) {
        socket.emit("workspace:leave", id);
        socket.off("workspace:updated", handleWorkspaceUpdated);
        socket.off("workspace:deleted", handleWorkspaceDeleted);
        socket.off("workspace:member:removed", handleMemberRemoved);
      }
      unsubscribe();
      disconnectSocket();
    };
  }, [id, currentWorkspace, user?._id, router, setCurrentWorkspace]);

  // Loading state
  if (pageLoading || (!currentWorkspace && !notFound) || (currentWorkspace?._id !== id && !notFound)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Memuat workspace...</p>
        </div>
      </div>
    );
  }

  // Not found / No access
  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20 shadow-2xs">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Workspace Tidak Ditemukan
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Workspace tidak ada atau kamu tidak memiliki akses. Pastikan tautan benar atau hubungi admin workspace.
          </p>
          <Link href="/workspaces">
            <Button variant="default" className="gap-2 rounded-xl text-xs mt-2 shadow-xs">
              <ChevronLeft className="h-4 w-4" />
              Kembali ke Daftar Workspace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <CopilotKit
        runtimeUrl={copilotRuntimeUrl}
        headers={copilotHeaders}
        onError={handleCopilotError}
      >
        <SidebarProvider>
          <AppSidebar workspaceId={id} workspace={currentWorkspace} />
          <SidebarInset className="bg-background">
            <Topbar workspace={currentWorkspace} workspaceId={id} />
            <main className="flex-1 overflow-auto">{children}</main>
            {isMobile && <BottomNav workspaceId={id} />}
            {isMobile && <MoreDrawer workspaceId={id} />}
          </SidebarInset>
        </SidebarProvider>
      </CopilotKit>
    </ProtectedRoute>
  );
}
