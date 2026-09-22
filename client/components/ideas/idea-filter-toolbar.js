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

  // Pengurutan digabung jadi satu kendali supaya tidak ada dua dropdown
  // bersebelahan yang mengatur hal yang sama.
  const sortValue = `${sortBy}:${sortOrder}`;
  const applySort = (value) => {
    const [field, order] = value.split(":");
    setSortBy(field);
    setSortOrder(order);
  };

  const hasFilter =
    filters.status.length > 0 || filters.labels.length > 0 || filters.keyword;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.keyword}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, keyword: e.target.value }))
          }
          placeholder="Cari ide..."
          className="h-9 pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Status
              {filters.status.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {filters.status.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {IDEA_STATUS_ORDER.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={filters.status.includes(status)}
                onCheckedChange={() => toggleStatus(status)}
                onSelect={(e) => e.preventDefault()}
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
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Tag className="h-3.5 w-3.5" />
                Label
                {filters.labels.length > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {filters.labels.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {labelOptions.map((label) => (
                <DropdownMenuCheckboxItem
                  key={label._id}
                  checked={filters.labels.includes(label._id)}
                  onCheckedChange={() => toggleLabel(label._id)}
                  onSelect={(e) => e.preventDefault()}
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
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="voteCount:desc">Terpopuler</SelectItem>
            <SelectItem value="createdAt:desc">Terbaru</SelectItem>
            <SelectItem value="createdAt:asc">Terlama</SelectItem>
            <SelectItem value="title:asc">Judul A-Z</SelectItem>
          </SelectContent>
        </Select>

        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-muted-foreground"
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
