"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IDEA_STATUS_CONFIG,
  IDEA_STATUS_ORDER,
} from "@/components/ideas/idea-status-badge";
import { Search, SlidersHorizontal, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function IdeaFilterToolbar({
  filters,
  setFilters,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  workspaceId,
}) {
  const [labelOptions, setLabelOptions] = useState([]);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    api
      .get(`/workspaces/${workspaceId}/labels`)
      .then(({ data }) => {
        if (active) setLabelOptions(data.data.labels);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [workspaceId]);

  const toggleStatus = (status) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const toggleLabel = (labelId) => {
    setFilters((prev) => ({
      ...prev,
      labels: prev.labels.includes(labelId)
        ? prev.labels.filter((l) => l !== labelId)
        : [...prev.labels, labelId],
    }));
  };

  // Pengurutan digabung jadi satu kendali
  const sortValue = `${sortBy}:${sortOrder}`;
  const applySort = (value) => {
    const [field, order] = value.split(":");
    setSortBy(field);
    setSortOrder(order);
  };

  const hasFilter =
    filters.status.length > 0 || filters.labels.length > 0 || filters.keyword;

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-3 shadow-xs">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.keyword}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, keyword: e.target.value }))
          }
          placeholder="Cari ide..."
          className="h-8.5 pl-8.5 text-xs rounded-xl border-border/80 bg-background/80"
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

      <div className="flex items-center gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8.5 gap-1.5 text-xs font-semibold rounded-xl border-border/80 bg-background/80">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              Status
              {filters.status.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                  {filters.status.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/80 shadow-xl">
            {IDEA_STATUS_ORDER.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={filters.status.includes(status)}
                onCheckedChange={() => toggleStatus(status)}
                onSelect={(e) => e.preventDefault()}
                className="text-xs font-semibold"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      IDEA_STATUS_CONFIG[status].dotClass,
                    )}
                  />
                  {IDEA_STATUS_CONFIG[status].label}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {labelOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8.5 gap-1.5 text-xs font-semibold rounded-xl border-border/80 bg-background/80">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                Label
                {filters.labels.length > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                    {filters.labels.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/80 shadow-xl">
              {labelOptions.map((label) => (
                <DropdownMenuCheckboxItem
                  key={label._id}
                  checked={filters.labels.includes(label._id)}
                  onCheckedChange={() => toggleLabel(label._id)}
                  onSelect={(e) => e.preventDefault()}
                  className="text-xs font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Select value={sortValue} onValueChange={applySort}>
          <SelectTrigger className="h-8.5 w-[140px] text-xs font-semibold rounded-xl border-border/80 bg-background/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/80 shadow-xl">
            <SelectItem value="voteCount:desc" className="text-xs font-semibold">Terpopuler</SelectItem>
            <SelectItem value="createdAt:desc" className="text-xs font-semibold">Terbaru</SelectItem>
            <SelectItem value="createdAt:asc" className="text-xs font-semibold">Terlama</SelectItem>
            <SelectItem value="title:asc" className="text-xs font-semibold">Judul A-Z</SelectItem>
          </SelectContent>
        </Select>

        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8.5 gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive rounded-xl"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                status: [],
                labels: [],
                keyword: "",
              }))
            }
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}