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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Item Baru — {PHASE_LABELS[phase]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Judul <span className="text-red-500">*</span>
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
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Due Date</Label>
            <RadioGroup
              value={dueDateMode}
              onValueChange={setDueDateMode}
              className="flex gap-4"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="relative" id="mode-relative" />
                <Label htmlFor="mode-relative" className="text-xs font-normal">
                  Relatif (H-N)
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="absolute" id="mode-absolute" />
                <Label htmlFor="mode-absolute" className="text-xs font-normal">
                  Tanggal
                </Label>
              </div>
            </RadioGroup>

            {dueDateMode === "relative" ? (
              <Input
                type="number"
                placeholder="mis. -14 untuk H-14, 2 untuk H+2"
                value={offsetDays}
                onChange={(e) => setOffsetDays(e.target.value)}
                className="h-9 text-xs"
              />
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left text-xs font-normal",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dueDate
                      ? format(dueDate, "d MMM yyyy", { locale: localeId })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating} size="sm">
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
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Buat Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
