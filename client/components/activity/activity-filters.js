"use client";

import { useState } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Filter, X } from "lucide-react";

const TARGET_TYPES = [
  { value: "all", label: "Semua Modul" },
  { value: "task", label: "Task" },
  { value: "event", label: "Event" },
  { value: "idea", label: "Bank Ide" },
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "workspace", label: "Workspace" },
];

export function ActivityFilters({ onChange }) {
  const { members } = useWorkspace();
  const [actorId, setActorId] = useState("all");
  const [targetType, setTargetType] = useState("all");

  const applyFilters = (newActorId, newTargetType) => {
    const params = {};
    if (newActorId && newActorId !== "all") params.actorId = newActorId;
    if (newTargetType && newTargetType !== "all")
      params.targetType = newTargetType;
    onChange?.(params);
  };

  const handleActorChange = (val) => {
    setActorId(val);
    applyFilters(val, targetType);
  };

  const handleTargetTypeChange = (val) => {
    setTargetType(val);
    applyFilters(actorId, val);
  };

  const handleReset = () => {
    setActorId("all");
    setTargetType("all");
    onChange?.({});
  };

  const hasActiveFilters = actorId !== "all" || targetType !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground shrink-0 shadow-2xs">
        <Filter className="h-3.5 w-3.5" />
      </div>

      {/* Member filter */}
      <Select value={actorId} onValueChange={handleActorChange}>
        <SelectTrigger className="w-[180px] h-8.5 rounded-xl border-border/80 bg-background/80 text-xs shadow-2xs">
          <SelectValue placeholder="Semua Member" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/80 shadow-lg">
          <SelectItem value="all" className="rounded-lg text-xs font-medium">Semua Member</SelectItem>
          {members?.map((m) => (
            <SelectItem key={m.userId} value={m.userId} className="rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <Avatar className="h-4.5 w-4.5">
                  <AvatarImage src={m.avatar} />
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                    {m.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{m.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Module filter */}
      <Select value={targetType} onValueChange={handleTargetTypeChange}>
        <SelectTrigger className="w-[160px] h-8.5 rounded-xl border-border/80 bg-background/80 text-xs shadow-2xs">
          <SelectValue placeholder="Semua Modul" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/80 shadow-lg">
          {TARGET_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value} className="rounded-lg text-xs font-medium">
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-8.5 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <X className="h-3.5 w-3.5" />
          Reset Filter
        </Button>
      )}
    </div>
  );
}
