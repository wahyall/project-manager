"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Archive,
  User,
  Tag,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getInitials, PRIORITY_CONFIG } from "./task-card";

// ── Multi-select filter popover ──────────────────────
function FilterPopover({
  trigger,
  title,
  options,
  selected,
  onToggle,
  renderOption,
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
          {title}
        </p>
        <Separator className="my-1" />
        <div className="max-h-60 overflow-y-auto space-y-0.5">
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-3 text-center">
              Tidak ada opsi
            </p>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left",
                  selected.includes(option.id) && "bg-accent"
                )}
                onClick={() => onToggle(option.id)}
              >
                <Checkbox
                  checked={selected.includes(option.id)}
                  className="h-3.5 w-3.5 pointer-events-none"
                />
                {renderOption ? renderOption(option) : <span>{option.label}</span>}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── FilterButton helper ──────────────────────────────
function FilterButton({ icon: Icon, label, count, active, ...props }) {
  return (
    <Button
      variant={active ? "secondary" : "outline"}
      size="sm"
      className={cn(
        "gap-1.5 h-8 text-xs font-medium",
        active && "border-primary/30"
      )}
      {...props}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {count > 0 && (
        <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] rounded-full">
          {count}
        </Badge>
      )}
      <ChevronDown className="h-3 w-3 ml-0.5 opacity-50" />
    </Button>
  );
}

// ── Main FilterToolbar ───────────────────────────────
export function FilterToolbar({
  filters,
  setFilters,
  activeFilterCount,
  members,
  labels,
  searchInputRef,
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Priority options
  const priorityOptions = [
    { id: "critical", label: "Critical", color: "bg-red-500" },
    { id: "high", label: "High", color: "bg-orange-500" },
    { id: "medium", label: "Medium", color: "bg-amber-400" },
    { id: "low", label: "Low", color: "bg-slate-400" },
  ];

  // Members as options
  const memberOptions = (members || []).map((m) => ({
    id: m.userId?._id || m._id,
    label: m.userId?.name || m.name || "Member",
    name: m.userId?.name || m.name,
  }));

  // Labels as options
  const labelOptions = (labels || []).map((l) => ({
    id: l._id,
    label: l.name,
    color: l.color,
  }));

  const toggleFilter = (key, value) => {
    setFilters((prev) => {
      const current = prev[key] || [];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      assignee: [],
      label: [],
      priority: [],
      eventId: null,
      dueDateFrom: null,
      dueDateTo: null,
      keyword: "",
      showArchived: false,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Cari task..."
          value={filters.keyword}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, keyword: e.target.value }))
          }
          className="h-8 w-48 pl-8 text-xs"
        />
        {filters.keyword && (
          <button
            onClick={() =>
              setFilters((prev) => ({ ...prev, keyword: "" }))
            }
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Assignee filter */}
      <FilterPopover
        trigger={
          <FilterButton
            icon={User}
            label="Assignee"
            count={filters.assignee.length}
            active={filters.assignee.length > 0}
          />
        }
        title="Filter Assignee"
        options={memberOptions}
        selected={filters.assignee}
        onToggle={(id) => toggleFilter("assignee", id)}
        renderOption={(option) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                {getInitials(option.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{option.label}</span>
          </div>
        )}
      />

      {/* Priority filter */}
      <FilterPopover
        trigger={
          <FilterButton
            icon={AlertTriangle}
            label="Prioritas"
            count={filters.priority.length}
            active={filters.priority.length > 0}
          />
        }
        title="Filter Prioritas"
        options={priorityOptions}
        selected={filters.priority}
        onToggle={(id) => toggleFilter("priority", id)}
        renderOption={(option) => (
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", option.color)} />
            <span>{option.label}</span>
          </div>
        )}
      />

      {/* Label filter */}
      <FilterPopover
        trigger={
          <FilterButton
            icon={Tag}
            label="Label"
            count={filters.label.length}
            active={filters.label.length > 0}
          />
        }
        title="Filter Label"
        options={labelOptions}
        selected={filters.label}
        onToggle={(id) => toggleFilter("label", id)}
        renderOption={(option) => (
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: option.color }}
            />
            <span className="truncate">{option.label}</span>
          </div>
        )}
      />

      {/* Archive toggle */}
      <div className="flex items-center gap-1.5 ml-1">
        <Switch
          id="show-archived"
          checked={filters.showArchived}
          onCheckedChange={(checked) =>
            setFilters((prev) => ({ ...prev, showArchived: checked }))
          }
          className="scale-75"
        />
        <label
          htmlFor="show-archived"
          className="text-xs text-muted-foreground cursor-pointer select-none"
        >
          Arsip
        </label>
      </div>

      {/* Active filters count & clear */}
      {activeFilterCount > 0 && (
        <>
          <Separator orientation="vertical" className="h-5" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
            onClick={clearAllFilters}
          >
            <X className="h-3 w-3" />
            Hapus {activeFilterCount} filter
          </Button>
        </>
      )}
    </div>
  );
}

