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
} from "lucide-react";

// ─── Topbar Component ───────────────────────────────
function Topbar({ workspace, workspaceId }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const id = workspaceId;

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsHook = useNotifications();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/80 backdrop-blur-md px-4 sm:px-6 transition-colors">
      {/* Sidebar trigger */}
      <SidebarTrigger className="-ml-1 hover:bg-accent/80 rounded-lg h-8 w-8 transition-colors" />
      <Separator orientation="vertical" className="mr-2 h-4 opacity-50" />

      {/* Workspace title breadcrumb snippet */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="hidden sm:inline-block font-semibold text-sm tracking-tight text-foreground/90 truncate max-w-[200px]">
          {workspace?.name}
        </span>
        {workspace?.isArchived && (
          <span className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0">
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
              className="h-9 w-9 relative rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors"
              onClick={() => setIsNotificationsOpen(true)}
            >
              <Bell className="h-4 w-4" />
              {notificationsHook.unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 ring-2 ring-background"></span>
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifikasi</TooltipContent>
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
              className="gap-2.5 pl-1.5 pr-2.5 py-1 h-9 rounded-xl hover:bg-accent/80 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="hidden md:inline text-sm font-medium max-w-[130px] truncate text-foreground">
                {user?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg border-border/70">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => router.push("/settings/account")}
              className="rounded-lg py-2 text-xs font-medium cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2.5 text-muted-foreground" />
              Pengaturan Akun
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(`/workspace/${id}/members/${user?._id}`)
              }
              className="rounded-lg py-2 text-xs font-medium cursor-pointer"
            >
              <User className="h-4 w-4 mr-2.5 text-muted-foreground" />
              Lihat Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => router.push("/workspaces")}
              className="rounded-lg py-2 text-xs font-medium cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 mr-2.5 text-muted-foreground" />
              Semua Workspace
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-2 text-xs font-medium cursor-pointer"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2.5" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ─── Layout ─────────────────────────────────────────
export default function WorkspaceLayout({ children, params }) {
  const { id } = use(params);
  const { currentWorkspace, setCurrentWorkspace, workspaces, loading } =
    useWorkspace();
  const [initialLoading, setInitialLoading] = useState(true);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isMobile = useIsMobile();

  const [apiBaseUrl, setApiBaseUrl] = useState(() => getApiUrl().replace(/\/$/, ""));

  useEffect(() => {
    return onServerSwitch(({ apiUrl }) => setApiBaseUrl((apiUrl || "").replace(/\/$/, "")));
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
    } else if (msg.includes("429") || msg.includes("rate") || msg.includes("limit")) {
      toast.error("Batas penggunaan tercapai. Coba lagi nanti.");
    } else {
      toast.error("Terjadi kesalahan pada AI Chat. Silakan coba lagi.");
    }
  }, []);

  // Load workspace and connect socket
  useEffect(() => {
    async function load() {
      await setCurrentWorkspace(id);
      setInitialLoading(false);
    }
    load();
  }, [id, setCurrentWorkspace]);

  // Initialize socket connection for presence
  useEffect(() => {
    if (!currentWorkspace) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket = connectSocket(token);
    if (socket) {
      socket.emit("workspace:join", id);
    }

    return () => {
      const s = getSocket();
      if (s) {
        s.emit("workspace:leave", id);
      }
    };
  }, [id, currentWorkspace]);

  if (initialLoading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!currentWorkspace) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen flex-col items-center justify-center p-4">
          <h2 className="text-xl font-semibold mb-2">
            Workspace tidak ditemukan
          </h2>
          <p className="text-muted-foreground mb-6">
            Workspace ini mungkin sudah dihapus atau kamu tidak memiliki akses.
          </p>
          <Link href="/workspaces">
            <Button>Kembali ke Daftar Workspace</Button>
          </Link>
        </div>
      </ProtectedRoute>
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
          <SidebarInset className="relative">
            <Topbar workspace={currentWorkspace} workspaceId={id} />
            <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
              {children}
            </div>
            {isMobile && (
              <BottomNav
                workspaceId={id}
                onMoreClick={() => setIsMoreOpen(true)}
              />
            )}
            <MoreDrawer
              open={isMoreOpen}
              onOpenChange={setIsMoreOpen}
              workspaceId={id}
              workspace={currentWorkspace}
            />
          </SidebarInset>
        </SidebarProvider>
      </CopilotKit>
    </ProtectedRoute>
  );
}
