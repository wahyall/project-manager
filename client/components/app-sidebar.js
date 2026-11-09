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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
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
} from "lucide-react";

// ─── Navigation structure ────────────────────────────
const NAV_MAIN = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "",
  },
  {
    label: "Divisi",
    icon: Users,
    href: "/divisions",
  },
  {
    label: "Event",
    icon: CalendarRange,
    href: "/events",
  },
  {
    label: "Task",
    icon: Columns3,
    href: "/tasks",
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
  // {
  //   label: "AI Chat",
  //   icon: Sparkles,
  //   href: "/ai-chat",
  // },
];

const NAV_OTHER = [
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
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-xl transition-all duration-200 hover:bg-sidebar-accent/70"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-xs shadow-sm ring-1 ring-primary/20">
                {initials}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight pl-0.5">
                <span className="truncate font-semibold tracking-tight text-foreground">
                  {workspace?.name || "Workspace"}
                </span>
                <span className="truncate text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  {workspace?.memberCount || 0} anggota
                </span>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-xl p-1.5 shadow-lg border-border/70"
            align="start"
            side="bottom"
            sideOffset={6}
          >
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Workspace Aktif
            </div>
            {workspaces?.active?.map((ws) => (
              <DropdownMenuItem
                key={ws._id}
                onClick={() => router.push(`/workspace/${ws._id}`)}
                className={`rounded-lg py-2 cursor-pointer transition-colors ${
                  ws._id === workspaceId ? "bg-accent/80 font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-bold mr-2">
                  {ws.name
                    ?.split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <span className="truncate flex-1 text-sm">{ws.name}</span>
                {ws._id === workspaceId && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => router.push("/workspaces")}
              className="rounded-lg py-2 text-xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 mr-2 text-muted-foreground" />
              Semua Workspace
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/workspaces/new")}
              className="rounded-lg py-2 text-xs font-medium text-primary cursor-pointer"
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
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Link href={`${basePath}${item.href}`} className="flex items-center gap-3">
                <item.icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    active ? "text-primary stroke-[2.25]" : "text-muted-foreground/80 stroke-[1.75]"
                  }`}
                />
                <span>{item.label}</span>
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

  const navItems = useMemo(() => {
    const items = [...NAV_MAIN];
    if (canAccessBM) {
      items.splice(2, 0, {
        label: "Baitul Maal (BM)",
        icon: HeartHandshake,
        href: "/baitul-mal",
      });
    }
    return items;
  }, [canAccessBM]);

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header: Workspace Switcher */}
      <SidebarHeader>
        <WorkspaceSwitcher workspaceId={workspaceId} workspace={workspace} />
      </SidebarHeader>

      {/* Content: Navigation */}
      <SidebarContent>
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup
              items={navItems}
              basePath={basePath}
              pathname={pathname}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Other navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Lainnya</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup
              items={NAV_OTHER}
              basePath={basePath}
              pathname={pathname}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <div className="px-2 py-1 text-[11px] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">
          YukNgaji Surabaya
        </div>
      </SidebarFooter>

      {/* Rail for collapsing */}
      <SidebarRail />
    </Sidebar>
  );
}
