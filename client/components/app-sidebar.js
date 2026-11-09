"use client";

import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { useWorkspaceDivisions } from "@/hooks/use-workspace-divisions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  CalendarRange,
  Columns3,
  Lightbulb,
  History,
  Settings,
  ChevronsUpDown,
  Plus,
  ChevronLeft,
  Sparkles,
  Sprout,
  Users,
  HeartHandshake,
  Bot,
  Check,
  Shield,
  Crown,
} from "lucide-react";

// ─── Navigation structure ────────────────────────────
const NAV_CORE = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "",
  },
  {
    label: "Task Board",
    icon: Columns3,
    href: "/tasks",
  },
  {
    label: "Event & Acara",
    icon: CalendarRange,
    href: "/events",
  },
];

const NAV_COMMUNITY = [
  {
    label: "Divisi Workspace",
    icon: Users,
    href: "/divisions",
  },
  {
    label: "Bank Ide",
    icon: Sprout,
    href: "/ideas",
  },
  {
    label: "Brainstorming",
    icon: Lightbulb,
    href: "/brainstorming",
  },
  {
    label: "AI Copilot",
    icon: Bot,
    href: "/ai-chat",
    isAi: true,
  },
];

const NAV_PREFERENCES = [
  {
    label: "Activity Log",
    icon: History,
    href: "/activity",
  },
  {
    label: "Pengaturan",
    icon: Settings,
    href: "/settings",
  },
];

// ─── Helper: check if a nav item is active ───────────
function isActive(pathname, basePath, href) {
  const full = basePath + href;
  if (href === "") {
    return pathname === basePath || pathname === basePath + "/";
  }
  return pathname === full || pathname.startsWith(full + "/");
}

// ─── Workspace Switcher ──────────────────────────────
function WorkspaceSwitcher({ workspaceId, workspace }) {
  const router = useRouter();
  const { workspaces } = useWorkspace();

  const initials =
    workspace?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "WS";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-2xl p-2 transition-all duration-200 hover:bg-sidebar-accent/70 border border-border/40 bg-sidebar/50 backdrop-blur-xs"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-xs shadow-xs ring-1 ring-primary/20">
                {initials}
              </div>
              <div className="grid flex-1 text-left text-xs leading-tight pl-1 min-w-0">
                <span className="truncate font-bold tracking-tight text-foreground text-sm">
                  {workspace?.name || "Workspace"}
                </span>
                <span className="truncate text-2xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  {workspace?.memberCount || 0} anggota tim
                </span>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-2xl p-2 shadow-xl border-border/80 bg-card/95 backdrop-blur-md"
            align="start"
            side="bottom"
            sideOffset={6}
          >
            <div className="px-2 py-1 text-2xs font-bold text-muted-foreground uppercase tracking-wider">
              Workspace Aktif
            </div>
            {workspaces?.active?.map((ws) => (
              <DropdownMenuItem
                key={ws._id}
                onClick={() => router.push(`/workspace/${ws._id}`)}
                className={`rounded-xl py-2 px-2.5 cursor-pointer transition-colors ${
                  ws._id === workspaceId
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-2xs font-bold mr-2.5 border border-primary/20">
                  {ws.name
                    ?.split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-xs font-medium text-foreground">{ws.name}</span>
                  <span className="text-2xs text-muted-foreground capitalize">
                    {ws.role || "Member"}
                  </span>
                </div>
                {ws._id === workspaceId && (
                  <Check className="h-3.5 w-3.5 text-primary ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem
              onClick={() => router.push("/workspaces")}
              className="rounded-xl py-2 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Kelola Semua Workspace
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/workspaces/new")}
              className="rounded-xl py-2 text-xs font-semibold text-primary cursor-pointer hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Buat Workspace Baru
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// ─── Nav Group renderer ──────────────────────────────
function NavGroup({ items, basePath, pathname }) {
  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const active = isActive(pathname, basePath, item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={active}
              tooltip={item.label}
              className={`rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 relative ${
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Link href={`${basePath}${item.href}`} className="flex items-center gap-2.5">
                <item.icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    active ? "text-primary-foreground stroke-[2.25]" : "text-muted-foreground/80 stroke-[1.75]"
                  }`}
                />
                <span className="truncate flex-1">{item.label}</span>
                {item.isAi && !active && (
                  <span className="text-2xs font-semibold px-1.5 py-0.2 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                    AI
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

// ─── Main AppSidebar component ───────────────────────
export function AppSidebar({ workspaceId, workspace, ...props }) {
  const pathname = usePathname();
  const basePath = `/workspace/${workspaceId}`;
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { divisions } = useWorkspaceDivisions(workspaceId);

  const canAccessBM = useMemo(() => {
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
  }, [workspace, currentWorkspace, user, divisions]);

  const communityNav = useMemo(() => {
    const items = [...NAV_COMMUNITY];
    if (canAccessBM) {
      items.unshift({
        label: "Baitul Maal (BM)",
        icon: HeartHandshake,
        href: "/baitul-mal",
      });
    }
    return items;
  }, [canAccessBM]);

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-sidebar/70 backdrop-blur-md" {...props}>
      {/* Header: Workspace Switcher */}
      <SidebarHeader className="p-3">
        <WorkspaceSwitcher workspaceId={workspaceId} workspace={workspace} />
      </SidebarHeader>

      {/* Content: Navigation */}
      <SidebarContent className="px-2 space-y-4">
        {/* Main core navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-2xs uppercase tracking-wider font-bold text-muted-foreground/80 px-2 mb-1">
            Proyek & Alur Kerja
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup
              items={NAV_CORE}
              basePath={basePath}
              pathname={pathname}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Community & Finance */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-2xs uppercase tracking-wider font-bold text-muted-foreground/80 px-2 mb-1">
            Organisasi & Inisiatif
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup
              items={communityNav}
              basePath={basePath}
              pathname={pathname}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Other navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-2xs uppercase tracking-wider font-bold text-muted-foreground/80 px-2 mb-1">
            Preferensi
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup
              items={NAV_PREFERENCES}
              basePath={basePath}
              pathname={pathname}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: User profile pill */}
      <SidebarFooter className="p-3 border-t border-border/40">
        <Link href="/settings/account" className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted/50 transition-colors group">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase() || "U"
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-semibold text-foreground truncate">{user?.name}</span>
            <span className="text-2xs text-muted-foreground truncate">{user?.email}</span>
          </div>
        </Link>
      </SidebarFooter>

      {/* Rail for collapsing */}
      <SidebarRail />
    </Sidebar>
  );
}
