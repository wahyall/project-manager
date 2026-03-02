"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CalendarDays,
  Filter,
  X,
  Search,
  LayoutGrid,
  Columns3,
  Clock,
  Users,
  Tag,
  AlertTriangle,
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
}) {
  // Get member list with proper structure
  const memberList = useMemo(
    () =>
      (members || []).map((m) => ({
        id: m.userId?._id || m._id,
        name: m.userId?.name || m.name || "Member",
      })),
    [members]
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
      type: "all",
    });
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Navigation + View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-background shadow-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-r-none"
                  onClick={onPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sebelumnya</TooltipContent>
            </Tooltip>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 rounded-none text-xs font-medium border-x"
              onClick={onToday}
            >
              Hari Ini
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-l-none"
                  onClick={onNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Berikutnya</TooltipContent>
            </Tooltip>
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-foreground ml-1 min-w-0 truncate">
            {title}
          </h2>
        </div>

        {/* Right: View switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-background shadow-sm p-0.5">
            {VIEW_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = currentView === opt.value;
              return (
                <Tooltip key={opt.value}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                      onClick={() => onViewChange(opt.value)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{opt.label}</TooltipContent>
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
            placeholder="Cari task..."
            value={filters.keyword}
            onChange={(e) =>
              onFiltersChange((prev) => ({ ...prev, keyword: e.target.value }))
            }
            className="h-8 w-[180px] pl-8 text-xs"
          />
          {filters.keyword && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() =>
                onFiltersChange((prev) => ({ ...prev, keyword: "" }))
              }
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Separator orientation="vertical" className="h-5 hidden sm:block" />

        {/* Assignee filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-xs gap-1.5",
                filters.assignee.length > 0 &&
                  "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Assignee
              {filters.assignee.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-4 min-w-4 px-1 text-[10px] rounded-full"
                >
                  {filters.assignee.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {memberList.map((member) => (
                <button
                  key={member.id}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                    filters.assignee.includes(member.id) && "bg-accent"
                  )}
                  onClick={() => toggleFilter("assignee", member.id)}
                >
                  <Checkbox
                    checked={filters.assignee.includes(member.id)}
                    className="h-3.5 w-3.5 pointer-events-none"
                  />
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
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
                "h-8 text-xs gap-1.5",
                filters.priority.length > 0 &&
                  "border-primary/50 bg-primary/5 text-primary"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Prioritas
              {filters.priority.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-4 min-w-4 px-1 text-[10px] rounded-full"
                >
                  {filters.priority.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-2" align="start">
            <div className="space-y-0.5">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                    filters.priority.includes(p.value) && "bg-accent"
                  )}
                  onClick={() => toggleFilter("priority", p.value)}
                >
                  <Checkbox
                    checked={filters.priority.includes(p.value)}
                    className="h-3.5 w-3.5 pointer-events-none"
                  />
                  <span className={cn("h-2.5 w-2.5 rounded-full", p.color)} />
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
                  "h-8 text-xs gap-1.5",
                  filters.label.length > 0 &&
                    "border-primary/50 bg-primary/5 text-primary"
                )}
              >
                <Tag className="h-3.5 w-3.5" />
                Label
                {filters.label.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 min-w-4 px-1 text-[10px] rounded-full"
                  >
                    {filters.label.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" align="start">
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {labels.map((label) => (
                  <button
                    key={label._id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                      filters.label.includes(label._id) && "bg-accent"
                    )}
                    onClick={() => toggleFilter("label", label._id)}
                  >
                    <Checkbox
                      checked={filters.label.includes(label._id)}
                      className="h-3.5 w-3.5 pointer-events-none"
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
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={clearAllFilters}
          >
            <X className="h-3 w-3" />
            Hapus Filter
            <Badge
              variant="secondary"
              className="h-4 min-w-4 px-1 text-[10px] rounded-full"
            >
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  );
}

