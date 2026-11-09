"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown, Loader2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export function IdeaLabelPicker({ workspaceId, value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (loaded || loading || !workspaceId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/labels`);
      setLabels(data.data.labels);
      setLoaded(true);
    } catch {
      setLabels([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, loaded, loading]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const toggle = (labelId) => {
    onChange(
      value.includes(labelId)
        ? value.filter((v) => v !== labelId)
        : [...value, labelId],
    );
  };

  const selected = labels.filter((l) => value.includes(l._id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-10 w-full justify-between rounded-xl border-border/80 bg-background/80 px-3 py-2 text-sm font-normal shadow-2xs hover:border-border hover:bg-background transition-all"
        >
          {value.length === 0 ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-3.5 w-3.5 opacity-60" />
              Pilih label...
            </span>
          ) : (
            <span className="flex flex-wrap gap-1.5 pr-2">
              {selected.map((l) => (
                <span
                  key={l._id}
                  className="inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${l.color}15`,
                    color: l.color,
                    borderColor: `${l.color}30`,
                  }}
                >
                  {l.name}
                </span>
              ))}
              {selected.length === 0 && (
                <span className="text-muted-foreground">
                  {value.length} label terpilih
                </span>
              )}
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] rounded-2xl border-border/80 bg-popover/95 p-1 backdrop-blur-md shadow-xl"
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput placeholder="Cari label..." className="h-9 text-xs" />
          <CommandList className="max-h-60 p-1">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Memuat label...
              </div>
            )}
            {!loading && (
              <>
                <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                  Belum ada label. Buat dulu di Pengaturan workspace.
                </CommandEmpty>
                <CommandGroup>
                  {labels.map((label) => {
                    const picked = value.includes(label._id);
                    return (
                      <CommandItem
                        key={label._id}
                        value={label.name}
                        onSelect={() => toggle(label._id)}
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs cursor-pointer"
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border",
                            picked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30",
                          )}
                        >
                          <Check
                            className={cn(
                              "h-3 w-3",
                              picked ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </div>
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="truncate font-medium text-foreground">
                          {label.name}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
