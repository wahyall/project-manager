"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Search,
  LayoutGrid,
  Columns3,
  Clock,
  Users,
  Tag,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/components/kanban/task-card";

const VIEW_OPTIONS = [
  { value: "dayGridMonth", label: "Bulanan", icon: LayoutGrid },
  { value: "timeGridWeek", label: "Mingguan", icon: Columns3 },
  { value: "timeGridDay", label: "Harian", icon: Clock },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-slate-400" },
  { value: "medium", label: "Medium", color: "bg-amber-400" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "critical", label: "Critical", color: "bg-red-500" },
];

export function CalendarToolbar({
  title,
  currentView,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  filters,
  onFiltersChange,
  activeFilterCount,
  members = [],
  labels = [],
  fixedType = null,
  searchPlaceholder = "Cari task...",
}) {
  const memberList = useMemo(
    () =>
      (members || []).map((m) => ({
        id: m.userId?._id || m.userId || m._id,
        name: m.userId?.name || m.name || "Member",
      })),
    [members],
  );

  const toggleFilter = (key, value) => {
    onFiltersChange((prev) => {
      const arr = prev[key];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      assignee: [],
      priority: [],
      label: [],
      eventId: null,
      keyword: "",
      type: fixedType || "all",
    });
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Navigation + View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-xl border border-border/80 bg-background/80 shadow-2xs overflow-hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8.5 w-8.5 rounded-none hover:bg-muted/60"
                  onClick={onPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-xl border-border/80 text-xs">Sebelumnya</TooltipContent>
            </Tooltip>

            <Button
              variant="ghost"
              size="sm"
              className="h-8.5 px-3.5 rounded-none text-xs font-semibold border-x border-border/80 hover:bg-muted/60"
              onClick={onToday}
            >
              Hari Ini
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8.5 w-8.5 rounded-none hover:bg-muted/60"
                  onClick={onNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-xl border-border/80 text-xs">Berikutnya</TooltipContent>
            </Tooltip>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-foreground ml-1 min-w-0 truncate tracking-tight">
            {title}
          </h2>
        </div>

        {/* Right: View switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-border/80 bg-background/80 shadow-2xs p-0.5">
            {VIEW_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = currentView === opt.value;
              return (
                <Tooltip key={opt.value}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                      )}
                      onClick={() => onViewChange(opt.value)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-xl border-border/80 text-xs">{opt.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={filters.keyword}
            onChange={(e) =>
              onFiltersChange((prev) => ({ ...prev, keyword: e.target.value }))
            }
            className="h-8.5 w-[200px] pl-8.5 text-xs rounded-xl border-border/80 bg-background/80 shadow-2xs"
          />
          {filters.keyword && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() =>
                onFiltersChange((prev) => ({ ...prev, keyword: "" }))
              }
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Separator orientation="vertical" className="h-5 hidden sm:block bg-border/60" />

        {/* Assignee filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8.5 text-xs gap-1.5 rounded-xl border-border/80 bg-background/80 shadow-2xs font-medium",
                filters.assignee.length > 0 &&
                  "border-primary/50 bg-primary/10 text-primary font-semibold",
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Assignee
              {filters.assignee.length > 0 && (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                  {filters.assignee.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1 rounded-2xl border-border/80 shadow-xl" align="start">
            <div className="max-h-52 overflow-y-auto space-y-0.5 p-1">
              {memberList.map((member) => (
                <button
                  key={member.id}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors cursor-pointer",
                    filters.assignee.includes(member.id) && "bg-muted/80 font-semibold",
                  )}
                  onClick={() => toggleFilter("assignee", member.id)}
                >
                  <Checkbox
                    checked={filters.assignee.includes(member.id)}
                    className="h-3.5 w-3.5 pointer-events-none rounded-md"
                  />
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs">{member.name}</span>
                </button>
              ))}
              {memberList.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Belum ada member
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Priority filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8.5 text-xs gap-1.5 rounded-xl border-border/80 bg-background/80 shadow-2xs font-medium",
                filters.priority.length > 0 &&
                  "border-primary/50 bg-primary/10 text-primary font-semibold",
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Prioritas
              {filters.priority.length > 0 && (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                  {filters.priority.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1 rounded-2xl border-border/80 shadow-xl" align="start">
            <div className="space-y-0.5 p-1">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors cursor-pointer",
                    filters.priority.includes(p.value) && "bg-muted/80 font-semibold",
                  )}
                  onClick={() => toggleFilter("priority", p.value)}
                >
                  <Checkbox
                    checked={filters.priority.includes(p.value)}
                    className="h-3.5 w-3.5 pointer-events-none rounded-md"
                  />
                  <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", p.color)} />
                  <span className="text-xs">{p.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Label filter */}
        {labels.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8.5 text-xs gap-1.5 rounded-xl border-border/80 bg-background/80 shadow-2xs font-medium",
                  filters.label.length > 0 &&
                    "border-primary/50 bg-primary/10 text-primary font-semibold",
                )}
              >
                <Tag className="h-3.5 w-3.5" />
                Label
                {filters.label.length > 0 && (
                  <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                    {filters.label.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1 rounded-2xl border-border/80 shadow-xl" align="start">
              <div className="max-h-52 overflow-y-auto space-y-0.5 p-1">
                {labels.map((label) => (
                  <button
                    key={label._id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors cursor-pointer",
                      filters.label.includes(label._id) && "bg-muted/80 font-semibold",
                    )}
                    onClick={() => toggleFilter("label", label._id)}
                  >
                    <Checkbox
                      checked={filters.label.includes(label._id)}
                      className="h-3.5 w-3.5 pointer-events-none rounded-md"
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="truncate text-xs">{label.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Clear all filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8.5 text-xs gap-1.5 rounded-xl text-muted-foreground hover:text-foreground font-medium"
            onClick={clearAllFilters}
          >
            <RotateCcw className="h-3 w-3" />
            Hapus Filter
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground px-1">
              {activeFilterCount}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
