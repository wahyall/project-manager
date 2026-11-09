"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Lazy-load MentionEditor to avoid SSR issues and reduce initial bundle.
const MentionEditor = lazy(() =>
  import("@/components/mention-editor").then((m) => ({
    default: m.MentionEditor,
  })),
);
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
  CalendarIcon,
  Loader2,
  Palette,
  Check,
  AlignLeft,
  Sprout,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IdeaPicker } from "@/components/ideas/idea-picker";

const EVENT_COLORS = [
  "#8B5CF6", // violet
  "#3B82F6", // blue
  "#06B6D4", // cyan
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#EC4899", // pink
  "#F97316", // orange
  "#14B8A6", // teal
  "#6366F1", // indigo
];

export function CreateEventDialog({
  open,
  onOpenChange,
  onCreate,
  workspaceId,
  divisions = [],
  defaultDivisionId,
}) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [editorKey, setEditorKey] = useState(0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [color, setColor] = useState(
    EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
  );
  const [status, setStatus] = useState("upcoming");
  const [ideas, setIdeas] = useState([]);
  const [divisionId, setDivisionId] = useState("");

  // Reset form on open
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setStartDate(null);
      setEndDate(null);
      setColor(EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)]);
      setStatus("upcoming");
      setIdeas([]);
      setDivisionId(defaultDivisionId || "");
      setErrors({});
      setEditorKey((k) => k + 1);
    }
  }, [open, defaultDivisionId]);

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = "Judul event harus diisi";
    if (title.trim().length > 100)
      newErrors.title = "Judul maksimal 100 karakter";
    if (!startDate) newErrors.startDate = "Tanggal mulai harus diisi";
    if (!endDate) newErrors.endDate = "Tanggal selesai harus diisi";
    if (startDate && endDate && endDate < startDate) {
      newErrors.endDate = "Tanggal selesai harus setelah tanggal mulai";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onCreate({
        title: title.trim(),
        description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        color,
        status,
        ideas,
        divisionId: divisionId || null,
      });
      onOpenChange(false);
    } catch (err) {
      setErrors({
        submit: err.response?.data?.message || "Gagal membuat event",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
            <div
              className="h-3.5 w-3.5 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: color }}
            />
            Buat Event Baru
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Rencanakan agenda, kajian, atau kegiatan baru di workspace ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="event-title" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Judul Event <span className="text-destructive">*</span>
            </Label>
            <Input
              id="event-title"
              placeholder="Contoh: Kajian Akbar Akhir Pekan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className={cn("h-9 text-xs font-semibold rounded-xl border-border/80 bg-background/80", errors.title && "border-destructive")}
              autoFocus
            />
            {errors.title && (
              <p className="text-[11px] text-destructive font-medium">{errors.title}</p>
            )}
          </div>

          {/* Description — BlockNote WYSIWYG */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <AlignLeft className="h-3 w-3 text-primary" />
              Deskripsi & Rincian
            </Label>
            <div className="py-2 px-5 rounded-2xl border border-border/80 bg-background/80 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-2xs">
              {open && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                      <span className="text-xs">Memuat editor...</span>
                    </div>
                  }
                >
                  <MentionEditor
                    key={editorKey}
                    workspaceId={workspaceId}
                    initialContent={null}
                    onChange={setDescription}
                    placeholder="Jelaskan tujuan, rundown, atau konsep event... ketik @ untuk mention"
                    className="blocknote-compact"
                  />
                </Suspense>
              )}
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tanggal Mulai <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left text-xs font-semibold h-9 rounded-xl border-border/80 bg-background/80",
                      !startDate && "text-muted-foreground font-normal",
                      errors.startDate && "border-destructive",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {startDate
                      ? format(startDate, "dd MMM yyyy", { locale: localeId })
                      : "Pilih tanggal mulai"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-border/80 shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      if (endDate && date && endDate < date) {
                        setEndDate(date);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && (
                <p className="text-[11px] text-destructive font-medium">{errors.startDate}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tanggal Selesai <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left text-xs font-semibold h-9 rounded-xl border-border/80 bg-background/80",
                      !endDate && "text-muted-foreground font-normal",
                      errors.endDate && "border-destructive",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {endDate
                      ? format(endDate, "dd MMM yyyy", { locale: localeId })
                      : "Pilih tanggal selesai"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-border/80 shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate && date < startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.endDate && (
                <p className="text-[11px] text-destructive font-medium">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Color & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Color Picker */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Palette className="h-3.5 w-3.5 text-primary" />
                Warna Tema
              </Label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-6 w-6 rounded-full transition-all border-2 flex items-center justify-center shadow-2xs",
                      color === c
                        ? "border-foreground scale-110 ring-2 ring-primary/20"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status Awal</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-xs font-semibold rounded-xl border-border/80 bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80 shadow-xl">
                  <SelectItem value="upcoming" className="text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Upcoming
                    </span>
                  </SelectItem>
                  <SelectItem value="ongoing" className="text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Ongoing
                    </span>
                  </SelectItem>
                  <SelectItem value="completed" className="text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      Completed
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Relasi Bank Ide */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Sprout className="h-3.5 w-3.5 text-emerald-500" />
              Realisasi dari Bank Ide
              <span className="font-normal text-muted-foreground lowercase">
                (opsional)
              </span>
            </Label>
            <IdeaPicker
              workspaceId={workspaceId}
              value={ideas}
              onChange={setIdeas}
            />
          </div>

          {/* Divisi Workspace */}
          {(divisions || []).length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Divisi Penanggung Jawab</Label>
              <Select
                value={divisionId || "none"}
                onValueChange={(val) =>
                  setDivisionId(val === "none" ? "" : val)
                }
              >
                <SelectTrigger className="h-9 text-xs font-semibold rounded-xl border-border/80 bg-background/80">
                  <SelectValue placeholder="Tanpa Divisi" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80 shadow-xl">
                  <SelectItem value="none" className="text-xs font-semibold">
                    <span className="text-muted-foreground">Tanpa Divisi</span>
                  </SelectItem>
                  {(divisions || []).map((div) => (
                    <SelectItem key={div._id} value={div._id.toString()} className="text-xs font-semibold">
                      <span className="flex items-center gap-2">
                        {div.color && (
                          <span
                            className="h-2 w-2 rounded-full inline-block"
                            style={{ backgroundColor: div.color }}
                          />
                        )}
                        {div.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl font-medium">
              {errors.submit}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-9 rounded-xl text-xs font-semibold"
          >
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="h-9 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Buat Event Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}