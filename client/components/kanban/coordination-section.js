"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  HandHeart,
  ListChecks,
  Lock,
  Plus,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getInitials } from "./task-card";

const toId = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    return (value._id || value.id || value)?.toString?.() || null;
  }
  return value.toString();
};

const memberOption = (member) => {
  const user = member?.userId || member;
  return {
    id: toId(user) || toId(member?._id),
    name: user?.name || member?.name || "Member",
    avatar: user?.avatar,
    role: member?.role,
  };
};

function CoordinationField({
  icon: Icon,
  label,
  placeholder,
  value,
  onSave,
  readOnly,
}) {
  const [draft, setDraft] = useState(value || "");
  const [lastValue, setLastValue] = useState(value || "");

  // Sinkronkan draft saat nilai dari server berubah tanpa useEffect.
  if ((value || "") !== lastValue) {
    setLastValue(value || "");
    setDraft(value || "");
  }

  const save = () => {
    if (readOnly) return;
    const next = draft.trim();
    if (next !== (value || "").trim()) onSave(next);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        placeholder={placeholder}
        readOnly={readOnly}
        rows={2}
        maxLength={2000}
        className={cn(
          "w-full resize-y rounded-md border bg-background px-2.5 py-2 text-xs leading-relaxed outline-none transition-colors",
          "placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring",
          readOnly && "cursor-default bg-muted/40 text-muted-foreground",
        )}
      />
    </div>
  );
}

export function CoordinationSection({
  task,
  divisions = [],
  onUpdate,
  canManage = false,
  readOnly = false,
}) {
  const involvedIds = useMemo(() => {
    const ids = [
      ...(task.divisionIds || []).map(toId),
      toId(task.divisionId),
    ].filter(Boolean);
    return [...new Set(ids)];
  }, [task.divisionId, task.divisionIds]);

  const populatedDivisionById = useMemo(() => {
    const map = new Map();
    for (const division of task.divisionIds || []) {
      const id = toId(division);
      if (id && typeof division === "object") map.set(id, division);
    }
    return map;
  }, [task.divisionIds]);

  const involvedDivisions = useMemo(
    () =>
      involvedIds.map((id) => {
        const populated = populatedDivisionById.get(id);
        const fromScope = (divisions || []).find(
          (division) => division._id?.toString() === id,
        );
        return (
          populated ||
          fromScope || {
            _id: id,
            name: "Divisi",
            color: null,
            members: [],
          }
        );
      }),
    [divisions, involvedIds, populatedDivisionById],
  );

  const primaryDivisionId = toId(task.divisionId);
  const eventLocked = !!task.eventId;

  const picByDivision = useMemo(() => {
    const map = new Map();
    for (const pic of task.divisionPics || []) {
      const divisionId = toId(pic.divisionId);
      const userId = toId(pic.userId);
      if (divisionId && userId) map.set(divisionId, userId);
    }
    return map;
  }, [task.divisionPics]);

  const membersForDivision = (divisionId) => {
    const division = (divisions || []).find(
      (item) => item._id?.toString() === divisionId,
    );
    return (division?.members || [])
      .map(memberOption)
      .filter((member) => member.id);
  };

  const setPic = (divisionId, userId) => {
    if (!canManage || readOnly) return;

    const next = new Map(picByDivision);
    if (!userId || userId === "none") {
      next.delete(divisionId);
    } else {
      next.set(divisionId, userId);
    }

    const divisionPics = involvedIds
      .map((id) => ({
        divisionId: id,
        userId: next.get(id),
      }))
      .filter((pic) => pic.userId);
    onUpdate({ divisionPics });
  };

  const toggleDivision = (divisionId) => {
    if (!canManage || readOnly) return;
    if (divisionId === primaryDivisionId) return;

    const nextIds = new Set(involvedIds);
    if (nextIds.has(divisionId)) {
      nextIds.delete(divisionId);
    } else {
      nextIds.add(divisionId);
    }

    const divisionIds = [...nextIds];
    let divisionIdValue = primaryDivisionId;
    if (!divisionIdValue && divisionIds.length > 0) {
      divisionIdValue = divisionIds[0];
    }

    const divisionPics = divisionIds
      .map((id) => ({
        divisionId: id,
        userId: picByDivision.get(id),
      }))
      .filter((pic) => pic.userId);

    onUpdate({
      divisionId: divisionIdValue,
      divisionIds,
      divisionPics,
    });
  };

  const coordination = task.coordination || {};

  return (
    <div className="mx-1 my-2 space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Koordinasi Antar-Divisi
            </h4>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Satu PIC untuk setiap divisi yang terlibat.
          </p>
        </div>
        {involvedDivisions.length > 1 && (
          <Badge
            variant="outline"
            className="shrink-0 border-primary/30 bg-primary/5 text-[10px] text-primary"
          >
            {involvedDivisions.length} divisi
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-medium text-muted-foreground">
          Divisi Terlibat
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canManage || readOnly}
              className="h-auto min-h-8 w-full justify-start gap-1.5 px-2 py-1.5 text-xs font-normal"
            >
              {involvedDivisions.length === 0 ? (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Plus className="h-3.5 w-3.5" />
                  Tambah divisi terlibat...
                </span>
              ) : (
                <span className="flex flex-wrap gap-1">
                  {involvedDivisions.map((division) => {
                    const id = toId(division);
                    const isPrimary = id === primaryDivisionId;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="h-5 gap-1 px-1.5 text-[10px]"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: division.color || "#94A3B8",
                          }}
                        />
                        {division.name || "Divisi"}
                        {isPrimary && <Lock className="h-2.5 w-2.5" />}
                      </Badge>
                    );
                  })}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Pilih Divisi
            </p>
            <Separator className="my-1" />
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {(divisions || []).map((division) => {
                const divisionId = toId(division);
                const checked = involvedIds.includes(divisionId);
                const isPrimary = divisionId === primaryDivisionId;
                return (
                  <button
                    key={divisionId}
                    type="button"
                    disabled={isPrimary && eventLocked}
                    onClick={() => toggleDivision(divisionId)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                      checked && "bg-accent",
                      isPrimary && eventLocked && "cursor-not-allowed",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={isPrimary && eventLocked}
                      className="pointer-events-none h-3.5 w-3.5"
                    />
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: division.color || "#94A3B8",
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {division.name}
                    </span>
                    {isPrimary && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
              {(divisions || []).length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  Belum ada divisi.
                </p>
              )}
            </div>
            {eventLocked && (
              <p className="mt-1 px-2 text-[10px] text-muted-foreground">
                Divisi utama terkunci mengikuti event.
              </p>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {involvedDivisions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-muted-foreground">
            PIC per Divisi
          </div>
          <div className="space-y-1">
            {involvedDivisions.map((division) => {
              const divisionId = toId(division);
              const selectedPic = picByDivision.get(divisionId) || "none";
              const options = membersForDivision(divisionId);
              return (
                <div
                  key={divisionId}
                  className="flex items-center gap-2 rounded-md border bg-background/70 px-2 py-1.5"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: division.color || "#94A3B8",
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {division.name || "Divisi"}
                  </span>
                  <Select
                    value={selectedPic}
                    onValueChange={(value) => setPic(divisionId, value)}
                    disabled={!canManage || readOnly}
                  >
                    <SelectTrigger className="h-7 w-[150px] text-[11px]">
                      <SelectValue placeholder="Pilih PIC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">
                          Belum ada PIC
                        </span>
                      </SelectItem>
                      {options.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <span className="flex items-center gap-1.5">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="bg-primary/10 text-[7px] text-primary">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="max-w-[120px] truncate">
                              {member.name}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                      {options.length === 0 && (
                        <div className="px-2 py-2 text-[11px] text-muted-foreground">
                          Tidak ada anggota divisi.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      <div className="grid gap-2 sm:grid-cols-1">
        <CoordinationField
          icon={AlertTriangle}
          label="Kendala"
          placeholder="Kendala yang dihadapi..."
          value={coordination.constraints || ""}
          onSave={(value) =>
            onUpdate({
              coordination: { ...coordination, constraints: value },
            })
          }
          readOnly={readOnly}
        />
        <CoordinationField
          icon={HandHeart}
          label="Bantuan yang Dibutuhkan"
          placeholder="Bantuan dari divisi lain..."
          value={coordination.helpNeeded || ""}
          onSave={(value) =>
            onUpdate({
              coordination: { ...coordination, helpNeeded: value },
            })
          }
          readOnly={readOnly}
        />
        <CoordinationField
          icon={ListChecks}
          label="Tindak Lanjut"
          placeholder="Rencana tindak lanjut..."
          value={coordination.followUp || ""}
          onSave={(value) =>
            onUpdate({
              coordination: { ...coordination, followUp: value },
            })
          }
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
