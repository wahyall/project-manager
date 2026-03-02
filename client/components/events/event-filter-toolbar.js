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
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari event..."
            value={filters.keyword}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, keyword: e.target.value }))
            }
            className="pl-8 h-9"
          />
          {filters.keyword && (
            <button
              onClick={() =>
                setFilters((prev) => ({ ...prev, keyword: "" }))
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          className="gap-1.5 h-9"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
          {hasActiveFilters && (
            <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
              {filters.status.length +
                (filters.participant ? 1 : 0) +
                (filters.startDateFrom || filters.startDateTo ? 1 : 0)}
            </span>
          )}
        </Button>

        {/* Sort */}
        <Select
          value={sortBy}
          onValueChange={(val) => setSortBy(val)}
        >
          <SelectTrigger className="w-[140px] h-9">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="startDate">Tanggal Mulai</SelectItem>
            <SelectItem value="title">Nama</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="createdAt">Dibuat</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
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
        <div className="flex flex-wrap items-center gap-2 pl-1 animate-in slide-in-from-top-1 duration-200">
          {/* Status filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Status:</span>
            {STATUS_OPTIONS.map((opt) => (
              <Badge
                key={opt.value}
                variant={
                  filters.status.includes(opt.value) ? "default" : "outline"
                }
                className={cn(
                  "cursor-pointer transition-colors text-xs h-6",
                  filters.status.includes(opt.value)
                    ? ""
                    : "hover:bg-accent",
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

          <div className="h-4 w-px bg-border" />

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Dari:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2">
                  <CalendarIcon className="h-3 w-3" />
                  {filters.startDateFrom
                    ? format(new Date(filters.startDateFrom), "dd MMM yy", {
                        locale: localeId,
                      })
                    : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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

            <span className="text-xs text-muted-foreground">s/d:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2">
                  <CalendarIcon className="h-3 w-3" />
                  {filters.startDateTo
                    ? format(new Date(filters.startDateTo), "dd MMM yy", {
                        locale: localeId,
                      })
                    : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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

          <div className="h-4 w-px bg-border" />

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
            <SelectTrigger className="h-6 text-xs w-[130px] px-2">
              <SelectValue placeholder="Peserta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua Peserta</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.userId?._id} value={m.userId?._id}>
                  {m.userId?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear all */}
          {hasActiveFilters && (
            <>
              <div className="h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 px-2 text-muted-foreground hover:text-destructive"
                onClick={clearAllFilters}
              >
                <X className="h-3 w-3" />
                Hapus Filter
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

