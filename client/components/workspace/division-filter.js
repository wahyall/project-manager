"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

/**
 * DivisionFilter — Dropdown filter divisi untuk halaman Event & Task.
 * - owner/admin: Semua Divisi + tiap divisi + Tanpa Divisi.
 * - member/guest (dikunci): Divisinya saja + Tanpa Divisi.
 */
export function DivisionFilter({ scope, className = "w-[195px]" }) {
  const { divisions, myDivisions, isLocked, selected, setSelected } = scope;

  const visibleDivisions = isLocked ? myDivisions : divisions;

  return (
    <Select value={selected} onValueChange={setSelected}>
      <SelectTrigger className={`h-8.5 rounded-xl border-border/80 bg-background/50 text-xs shadow-2xs gap-2 ${className}`}>
        <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
        <SelectValue placeholder="Divisi" />
      </SelectTrigger>
      <SelectContent className="rounded-xl shadow-lg border-border/80">
        {!isLocked && <SelectItem value="all" className="text-xs">Semua Divisi</SelectItem>}
        {isLocked && myDivisions.length > 1 && (
          <SelectItem value="mine" className="text-xs">Divisi Saya</SelectItem>
        )}
        {visibleDivisions.map((d) => (
          <SelectItem key={d._id} value={d._id.toString()} className="text-xs">
            <span className="flex items-center gap-2">
              {d.color && (
                <span
                  className="h-2 w-2 rounded-full inline-block shrink-0 shadow-2xs"
                  style={{ backgroundColor: d.color }}
                />
              )}
              <span className="truncate">{d.name}</span>
            </span>
          </SelectItem>
        ))}
        <SelectItem value="none" className="text-xs">Tanpa Divisi</SelectItem>
      </SelectContent>
    </Select>
  );
}
