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
    { label: "Task", href: "/tasks/kanban", icon: Columns3 },
    { label: "Board", href: "/brainstorming", icon: Lightbulb },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t bg-background/95 backdrop-blur pb-safe-area lg:hidden">
      {tabs.map((tab) => {
        const isActive =
          tab.href === ""
            ? pathname === basePath || pathname === `${basePath}/`
            : pathname.startsWith(`${basePath}${tab.href}`);

        return (
          <Link
            key={tab.label}
            href={`${basePath}${tab.href}`}
            className="flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
          >
            <div
              className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <tab.icon
                className={`h-5 w-5 ${isActive ? "fill-primary/20" : ""}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </div>
            <span
              className={`text-[10px] font-medium tracking-wide ${
                isActive ? "text-primary" : "text-muted-foreground"
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
        className="flex flex-1 flex-col items-center justify-center gap-1 transition-colors group"
      >
        <div className="flex h-8 w-12 items-center justify-center rounded-full text-muted-foreground group-hover:bg-muted transition-all duration-300">
          <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
        </div>
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
          Lainnya
        </span>
      </button>
    </div>
  );
}
