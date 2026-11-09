"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PHASE_LABELS } from "@/lib/pipeline-phases";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PipelineQuickCreateModal({
  open,
  onOpenChange,
  phase,
  onCreateTask,
}) {
  const [title, setTitle] = useState("");
  const [dueDateMode, setDueDateMode] = useState("relative");
  const [offsetDays, setOffsetDays] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [creating, setCreating] = useState(false);
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDueDateMode("relative");
      setOffsetDays("");
      setDueDate(null);
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const taskData = {
        title: title.trim(),
        dueDateMode,
        dueOffsetDays: dueDateMode === "relative" ? Number(offsetDays) : null,
        dueDate:
          dueDateMode === "absolute" && dueDate ? dueDate.toISOString() : null,
      };
      await onCreateTask(phase, taskData);
      onOpenChange(false);
    } catch (err) {
      toast.error("Gagal membuat item");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Item Baru — {PHASE_LABELS[phase]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Judul Item <span className="text-destructive">*</span>
            </Label>
            <Input
              ref={titleInputRef}
              placeholder="Contoh: Susun rundown acara"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              className="h-9 text-xs font-semibold rounded-xl border-border/80 bg-background/80"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tenggat Waktu</Label>
            <RadioGroup
              value={dueDateMode}
              onValueChange={setDueDateMode}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="relative" id="mode-relative" />
                <Label htmlFor="mode-relative" className="text-xs font-semibold cursor-pointer">
                  Relatif (H-N / H+N)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="absolute" id="mode-absolute" />
                <Label htmlFor="mode-absolute" className="text-xs font-semibold cursor-pointer">
                  Tanggal Pasti
                </Label>
              </div>
            </RadioGroup>

            {dueDateMode === "relative" ? (
              <Input
                type="number"
                placeholder="mis. -14 untuk H-14, 2 untuk H+2"
                value={offsetDays}
                onChange={(e) => setOffsetDays(e.target.value)}
                className="h-8.5 text-xs rounded-xl border-border/80 bg-background/80"
              />
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-8.5 justify-start text-left text-xs font-semibold rounded-xl border-border/80 bg-background/80",
                      !dueDate && "text-muted-foreground font-normal",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {dueDate
                      ? format(dueDate, "d MMM yyyy", { locale: localeId })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-border/80 shadow-2xl" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating} size="sm" className="h-9 rounded-xl text-xs font-semibold">
            Batal
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              !title.trim() ||
              creating ||
              (dueDateMode === "relative" && offsetDays === "")
            }
            size="sm"
            className="h-9 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Buat Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}