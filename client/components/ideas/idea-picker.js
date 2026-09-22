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
import { Check, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
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

  // Diambil saat popover pertama kali dibuka, bukan saat render,
  // supaya form Event tidak menanggung permintaan yang sering tak terpakai.
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

  // Ide yang sudah dipilih tetap ditampilkan sebagai chip meskipun
  // daftar opsi belum dimuat, memakai judul dari opsi bila tersedia.
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

  // Ide berstatus diarsipkan disembunyikan dari pilihan, kecuali
  // kalau sudah terlanjur terpilih sebelumnya.
  const selectable = options.filter(
    (o) => o.status !== "diarsipkan" || value.includes(o._id),
  );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-auto min-h-9 w-full justify-between px-3 py-2 font-normal"
          >
            {selected.length === 0 ? (
              <span className="text-muted-foreground">
                Pilih ide yang diwujudkan
              </span>
            ) : (
              <span className="flex flex-wrap gap-1 pr-2">
                {selected.map((s) => (
                  <span
                    key={s._id}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
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
                      className="rounded-sm hover:bg-foreground/10"
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
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Cari ide..." />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat ide...
                </div>
              )}

              {error && (
                <div className="px-3 py-6 text-center text-sm text-destructive">
                  {error}
                </div>
              )}

              {!loading && !error && (
                <>
                  <CommandEmpty>
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
                          className="gap-2"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0",
                              picked ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              config.dotClass,
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {idea.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
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

      <p className="text-xs text-muted-foreground">
        Event ini menjadi wujud nyata dari ide yang dipilih
      </p>
    </div>
  );
}
