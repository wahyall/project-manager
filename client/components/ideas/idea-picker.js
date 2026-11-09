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
import { IDEA_STATUS_CONFIG } from "@/components/ideas/idea-status-badge";
import { Check, ChevronDown, ChevronUp, Lightbulb, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function IdeaPicker({
  workspaceId,
  value = [],
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadOptions = useCallback(async () => {
    if (loaded || loading || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(
        `/workspaces/${workspaceId}/ideas?sortBy=voteCount&sortOrder=desc&limit=100`,
      );
      setOptions(data.data.ideas);
      setLoaded(true);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat daftar ide");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, loaded, loading]);

  useEffect(() => {
    if (open) loadOptions();
  }, [open, loadOptions]);

  const selected = value.map((id) => {
    const found = options.find((o) => o._id === id);
    return { _id: id, title: found?.title || "Ide", status: found?.status };
  });

  const toggle = (ideaId) => {
    onChange(
      value.includes(ideaId)
        ? value.filter((v) => v !== ideaId)
        : [...value, ideaId],
    );
  };

  const selectable = options.filter(
    (o) => o.status !== "diarsipkan" || value.includes(o._id),
  );

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-auto min-h-10 w-full justify-between rounded-xl border-border/80 bg-background/80 px-3 py-2 text-sm font-normal shadow-2xs hover:border-border hover:bg-background transition-all"
          >
            {selected.length === 0 ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Lightbulb className="h-4 w-4 opacity-60" />
                <span>Pilih ide yang diwujudkan...</span>
              </span>
            ) : (
              <span className="flex flex-wrap gap-1.5 pr-2">
                {selected.map((s) => (
                  <span
                    key={s._id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400"
                  >
                    <span className="max-w-[160px] truncate">{s.title}</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={`Lepas ${s.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(s._id);
                      }}
                      className="rounded p-0.5 hover:bg-amber-500/20 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </span>
                ))}
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
            <CommandInput placeholder="Cari ide..." className="h-9 text-xs" />
            <CommandList className="max-h-60 p-1">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memuat ide...
                </div>
              )}

              {error && (
                <div className="px-3 py-4 text-center text-xs text-destructive">
                  {error}
                </div>
              )}

              {!loading && !error && (
                <>
                  <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                    Belum ada ide di Bank Ide workspace ini.
                  </CommandEmpty>
                  <CommandGroup>
                    {selectable.map((idea) => {
                      const picked = value.includes(idea._id);
                      const config =
                        IDEA_STATUS_CONFIG[idea.status] ||
                        IDEA_STATUS_CONFIG.baru;
                      return (
                        <CommandItem
                          key={idea._id}
                          value={idea.title}
                          onSelect={() => toggle(idea._id)}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs cursor-pointer"
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
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              config.dotClass,
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                            {idea.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            <ChevronUp className="h-3 w-3" />
                            {idea.voteCount}
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

      <p className="text-[11px] text-muted-foreground pl-0.5">
        Event ini akan ditautkan sebagai realisasi dari ide yang dipilih
      </p>
    </div>
  );
}
