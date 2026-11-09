"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Archive,
  ArchiveRestore,
  Loader2,
  Save,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Building2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function GeneralTab({ workspace, isAdminOrOwner }) {
  const router = useRouter();
  const {
    updateWorkspace,
    deleteWorkspace,
    archiveWorkspace,
    unarchiveWorkspace,
  } = useWorkspace();

  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const hasChanges =
    name !== workspace.name || description !== (workspace.description || "");

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nama workspace tidak boleh kosong");
      return;
    }

    setSaving(true);
    try {
      await updateWorkspace(workspace._id, {
        name: name.trim(),
        description: description.trim(),
      });
      toast.success("Pengaturan workspace berhasil disimpan");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal menyimpan pengaturan",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      if (workspace.isArchived) {
        await unarchiveWorkspace(workspace._id);
        toast.success("Workspace berhasil diunarsipkan");
      } else {
        await archiveWorkspace(workspace._id);
        toast.success("Workspace berhasil diarsipkan");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal mengarsipkan");
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmName !== workspace.name) {
      toast.error("Nama workspace tidak cocok");
      return;
    }

    setDeleting(true);
    try {
      await deleteWorkspace(workspace._id);
      toast.success("Workspace berhasil dihapus");
      router.push("/workspaces");
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menghapus workspace");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Informasi Workspace
              </CardTitle>
              <CardDescription className="text-xs">
                Ubah identitas visual dan ringkasan workspace kamu
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ws-name" className="text-xs font-medium text-foreground">
                Nama Workspace <span className="text-destructive">*</span>
              </Label>
              <span className="text-2xs text-muted-foreground tabular-nums">
                {name.length}/50
              </span>
            </div>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              disabled={!isAdminOrOwner}
              className="max-w-xl h-10 rounded-xl bg-background/50 border-border/80 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ws-desc" className="text-xs font-medium text-foreground">
                Deskripsi Singkat
              </Label>
              <span className="text-2xs text-muted-foreground tabular-nums">
                {description.length}/500
              </span>
            </div>
            <Textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={!isAdminOrOwner}
              rows={3}
              className="max-w-xl resize-none rounded-xl bg-background/50 border-border/80 focus:ring-2 focus:ring-primary/20 text-sm leading-relaxed"
              placeholder="Jelaskan tujuan atau ruang lingkup workspace ini..."
            />
          </div>

          {isAdminOrOwner && (
            <div className="pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="gap-2 rounded-xl h-10 px-5 shadow-xs transition-all"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan Perubahan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Admin - Owner Only */}
      {workspace.role === "owner" && (
        <Card className="rounded-2xl border-emerald-500/20 shadow-xs bg-emerald-500/[0.02] backdrop-blur-xs">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">
                    Notifikasi WhatsApp Bot
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Kirim pengingat event, tugas deadline, dan notifikasi Baitul Maal otomatis ke nomor anggota
                  </CardDescription>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-2xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Owner Only
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/workspace/${workspace._id}/admin/whatsapp`}>
              <Button
                variant="outline"
                className="gap-2 rounded-xl h-10 border-emerald-200/80 hover:border-emerald-300 hover:bg-emerald-50/50 text-emerald-700 dark:border-emerald-800/60 dark:hover:bg-emerald-950/40 dark:text-emerald-400"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Buka Panel Koneksi WhatsApp</span>
                <ChevronRight className="h-4 w-4 ml-1 opacity-70" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Archive */}
      {isAdminOrOwner && (
        <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Archive className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Arsip Workspace
                </CardTitle>
                <CardDescription className="text-xs">
                  {workspace.isArchived
                    ? "Workspace ini saat ini dibekukan (read-only). Anggota masih dapat melihat data tanpa membuat perubahan."
                    : "Bekukan aktivitas workspace jika proyek selesai. Seluruh data tetap utuh dan dapat diaktifkan kembali kapan saja."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant={workspace.isArchived ? "default" : "outline"}
              onClick={handleArchive}
              disabled={archiving}
              className="gap-2 rounded-xl h-10"
            >
              {archiving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : workspace.isArchived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {workspace.isArchived
                ? "Unarsipkan Workspace"
                : "Arsipkan Workspace"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete — Owner only */}
      {workspace.role === "owner" && (
        <Card className="rounded-2xl border-destructive/30 shadow-xs bg-destructive/[0.02] backdrop-blur-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-destructive">
                  Zona Berbahaya
                </CardTitle>
                <CardDescription className="text-xs">
                  Tindakan ini menghapus workspace beserta seluruh event, task, spreadsheet, kas, dan media di dalamnya secara permanen.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2 rounded-xl h-10">
                  <Trash2 className="h-4 w-4" />
                  Hapus Workspace Ini
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl border-destructive/30 p-6">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Konfirmasi Hapus Workspace
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 text-sm pt-2">
                    <span className="block text-muted-foreground">
                      Tindakan ini <strong className="text-foreground">tidak dapat dibatalkan</strong>. Semua dokumen, papan brainstorming, catatan kas, dan penugasan anggota akan dihapus secara permanen.
                    </span>
                    <span className="block text-foreground font-medium">
                      Ketik nama workspace <span className="font-mono px-2 py-0.5 rounded bg-muted text-foreground border border-border">{workspace.name}</span> untuk melanjutkan:
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={workspace.name}
                  className="mt-3 rounded-xl h-10 bg-background/50"
                />
                <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
                  <AlertDialogCancel
                    onClick={() => setDeleteConfirmName("")}
                    className="rounded-xl"
                  >
                    Batal
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting || deleteConfirmName !== workspace.name}
                    className="rounded-xl gap-2"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Hapus Permanen
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
