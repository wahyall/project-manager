"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  CalendarRange,
  Columns3,
  Lightbulb,
  MoreHorizontal,
} from "lucide-react";

export function BottomNav({ workspaceId, onMoreClick }) {
  const pathname = usePathname();
  const basePath = `/workspace/${workspaceId}`;

  const tabs = [
    { label: "Dashboard", href: "", icon: Home },
    { label: "Event", href: "/events", icon: CalendarRange },
    { label: "Task", href: "/tasks", icon: Columns3 },
    { label: "Board", href: "/brainstorming", icon: Lightbulb },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-border/60 bg-background/90 backdrop-blur-lg px-2 pb-safe-area lg:hidden shadow-lg">
      {tabs.map((tab) => {
        const isActive =
          tab.href === ""
            ? pathname === basePath || pathname === `${basePath}/`
            : pathname.startsWith(`${basePath}${tab.href}`);

        return (
          <Link
            key={tab.label}
            href={`${basePath}${tab.href}`}
            className="flex flex-1 flex-col items-center justify-center gap-1 transition-all py-1"
          >
            <div
              className={`flex h-8 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <tab.icon
                className="h-4.5 w-4.5"
                strokeWidth={isActive ? 2.5 : 2}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight transition-colors ${
                isActive ? "font-semibold text-primary" : "font-normal text-muted-foreground"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}

      {/* Button Lainnya (More Drawer) */}
      <button
        onClick={onMoreClick}
        className="flex flex-1 flex-col items-center justify-center gap-1 transition-all py-1 group"
      >
        <div className="flex h-8 w-12 items-center justify-center rounded-xl text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground transition-all duration-200">
          <MoreHorizontal className="h-4.5 w-4.5" strokeWidth={2} />
        </div>
        <span className="text-[10px] tracking-tight font-normal text-muted-foreground group-hover:text-foreground">
          Lainnya
        </span>
      </button>
    </div>
  );
}
