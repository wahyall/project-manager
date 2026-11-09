"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  SlidersHorizontal,
  CalendarIcon,
  X,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming", color: "bg-blue-500" },
  { value: "ongoing", label: "Ongoing", color: "bg-emerald-500" },
  { value: "completed", label: "Completed", color: "bg-gray-400" },
];

export function EventFilterToolbar({
  filters,
  setFilters,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  members = [],
}) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.participant ||
    filters.startDateFrom ||
    filters.startDateTo;

  const clearAllFilters = () => {
    setFilters({
      status: [],
      participant: null,
      startDateFrom: null,
      startDateTo: null,
      keyword: "",
    });
  };

  const toggleStatus = (statusValue) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(statusValue)
        ? prev.status.filter((s) => s !== statusValue)
        : [...prev.status, statusValue],
    }));
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-3 shadow-xs space-y-3">
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari event..."
            value={filters.keyword}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, keyword: e.target.value }))
            }
            className="pl-8.5 h-8.5 text-xs rounded-xl border-border/80 bg-background/80"
          />
          {filters.keyword && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, keyword: "" }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5 h-8.5 text-xs font-semibold rounded-xl border-border/80"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
          {hasActiveFilters && (
            <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {filters.status.length +
                (filters.participant ? 1 : 0) +
                (filters.startDateFrom || filters.startDateTo ? 1 : 0)}
            </span>
          )}
        </Button>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
          <SelectTrigger className="w-[140px] h-8.5 text-xs font-semibold rounded-xl border-border/80 bg-background/80">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/80 shadow-xl">
            <SelectItem value="startDate" className="text-xs font-semibold">Tanggal Mulai</SelectItem>
            <SelectItem value="title" className="text-xs font-semibold">Nama Event</SelectItem>
            <SelectItem value="status" className="text-xs font-semibold">Status</SelectItem>
            <SelectItem value="createdAt" className="text-xs font-semibold">Tanggal Buat</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-8.5 w-8.5 rounded-xl text-muted-foreground hover:text-foreground"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          title={sortOrder === "asc" ? "Urutkan menurun" : "Urutkan menaik"}
        >
          <ArrowUpDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              sortOrder === "asc" && "rotate-180",
            )}
          />
        </Button>
      </div>

      {/* Filter row (collapsible) */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 animate-in slide-in-from-top-1 duration-200">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 uppercase tracking-wider">Status:</span>
            {STATUS_OPTIONS.map((opt) => (
              <Badge
                key={opt.value}
                variant={
                  filters.status.includes(opt.value) ? "default" : "outline"
                }
                className={cn(
                  "cursor-pointer transition-colors text-[11px] font-semibold h-6 rounded-lg",
                  filters.status.includes(opt.value) ? "" : "hover:bg-accent border-border/80",
                )}
                onClick={() => toggleStatus(opt.value)}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full mr-1.5", opt.color)}
                />
                {opt.label}
              </Badge>
            ))}
          </div>

          <div className="h-4 w-px bg-border/80 hidden sm:block" />

          {/* Date range */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Dari:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6.5 text-[11px] font-semibold gap-1 px-2.5 rounded-lg border-border/80"
                >
                  <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                  {filters.startDateFrom
                    ? format(new Date(filters.startDateFrom), "dd MMM yy", {
                        locale: localeId,
                      })
                    : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl border-border/80 shadow-2xl" align="start">
                <Calendar
                  mode="single"
                  selected={
                    filters.startDateFrom
                      ? new Date(filters.startDateFrom)
                      : undefined
                  }
                  onSelect={(date) =>
                    setFilters((prev) => ({
                      ...prev,
                      startDateFrom: date ? date.toISOString() : null,
                    }))
                  }
                />
              </PopoverContent>
            </Popover>

            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">s/d:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6.5 text-[11px] font-semibold gap-1 px-2.5 rounded-lg border-border/80"
                >
                  <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                  {filters.startDateTo
                    ? format(new Date(filters.startDateTo), "dd MMM yy", {
                        locale: localeId,
                      })
                    : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl border-border/80 shadow-2xl" align="start">
                <Calendar
                  mode="single"
                  selected={
                    filters.startDateTo
                      ? new Date(filters.startDateTo)
                      : undefined
                  }
                  onSelect={(date) =>
                    setFilters((prev) => ({
                      ...prev,
                      startDateTo: date ? date.toISOString() : null,
                    }))
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="h-4 w-px bg-border/80 hidden sm:block" />

          {/* Participant */}
          <Select
            value={filters.participant || "__all__"}
            onValueChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                participant: val === "__all__" ? null : val,
              }))
            }
          >
            <SelectTrigger className="h-6.5 text-[11px] font-semibold w-[130px] px-2 rounded-lg border-border/80 bg-background/80">
              <SelectValue placeholder="Peserta" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/80 shadow-xl">
              <SelectItem value="__all__" className="text-xs font-semibold">Semua Peserta</SelectItem>
              {members.map((m) => {
                const userId =
                  typeof m.userId === "object" ? m.userId?._id : m.userId;
                const userName =
                  typeof m.userId === "object" ? m.userId?.name : m.name;
                return (
                  <SelectItem key={userId} value={userId} className="text-xs font-semibold">
                    {userName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Clear all */}
          {hasActiveFilters && (
            <>
              <div className="h-4 w-px bg-border/80" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6.5 text-[11px] font-semibold gap-1 px-2 text-muted-foreground hover:text-destructive rounded-lg"
                onClick={clearAllFilters}
              >
                <X className="h-3 w-3" />
                Reset Filter
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}