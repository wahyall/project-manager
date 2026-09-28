"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePipelineTemplates } from "@/hooks/use-pipeline-templates";
import { toast } from "sonner";

export function PipelineTemplateDialog({
  open,
  mode, // "apply" | "save"
  onOpenChange,
  workspaceId,
  onApplyTemplate,
  onSaveAsTemplate,
}) {
  const { templates, loading, deleteTemplate } = usePipelineTemplates(workspaceId);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleApply = async () => {
    if (!selectedTemplateId) return;
    setBusy(true);
    try {
      await onApplyTemplate(selectedTemplateId);
      toast.success("Template diterapkan");
      onOpenChange(false);
    } catch (err) {
      toast.error("Gagal menerapkan template");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await onSaveAsTemplate(newName.trim(), "");
      toast.success("Template disimpan");
      onOpenChange(false);
    } catch (err) {
      toast.error("Gagal menyimpan template");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "save" ? "Simpan sebagai Template" : "Kelola Template Pipeline"}
          </DialogTitle>
        </DialogHeader>

        {mode === "save" ? (
          <div className="space-y-1.5 py-2">
            <Label className="text-xs font-medium">Nama Template</Label>
            <Input
              placeholder="Contoh: Template Seminar"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Terapkan Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name} ({t.items.length} item)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Semua Template</Label>
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-1.5">
                {loading && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Memuat...
                  </p>
                )}
                {!loading && templates.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Belum ada template
                  </p>
                )}
                {templates.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent"
                  >
                    <span className="text-xs">{t.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => deleteTemplate(t._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy} size="sm">
            Batal
          </Button>
          {mode === "save" ? (
            <Button onClick={handleSave} disabled={!newName.trim() || busy} size="sm">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Simpan
            </Button>
          ) : (
            <Button onClick={handleApply} disabled={!selectedTemplateId || busy} size="sm">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Terapkan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
