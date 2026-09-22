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
          className="h-auto min-h-9 w-full justify-between px-3 py-2 font-normal"
        >
          {value.length === 0 ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Pilih label
            </span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {selected.map((l) => (
                <span
                  key={l._id}
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: `${l.color}1a`, color: l.color }}
                >
                  {l.name}
                </span>
              ))}
              {selected.length === 0 && (
                <span className="text-muted-foreground">
                  {value.length} label
                </span>
              )}
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Cari label..." />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat label...
              </div>
            )}
            {!loading && (
              <>
                <CommandEmpty>
                  Belum ada label. Buat dulu di Pengaturan workspace.
                </CommandEmpty>
                <CommandGroup>
                  {labels.map((label) => (
                    <CommandItem
                      key={label._id}
                      value={label.name}
                      onSelect={() => toggle(label._id)}
                      className="gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value.includes(label._id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="truncate">{label.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
