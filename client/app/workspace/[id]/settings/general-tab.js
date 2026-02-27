"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
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
} from "lucide-react";
import { toast } from "sonner";

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
      <Card>
        <CardHeader>
          <CardTitle>Informasi Workspace</CardTitle>
          <CardDescription>
            Ubah nama dan deskripsi workspace kamu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name">
              Nama Workspace <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              disabled={!isAdminOrOwner}
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">{name.length}/50</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-desc">Deskripsi</Label>
            <Textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={!isAdminOrOwner}
              rows={3}
              className="max-w-md resize-none"
              placeholder="Jelaskan tujuan workspace ini..."
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500
            </p>
          </div>

          {isAdminOrOwner && (
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan Perubahan
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Archive */}
      {isAdminOrOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Arsip Workspace
            </CardTitle>
            <CardDescription>
              {workspace.isArchived
                ? "Workspace ini sedang diarsipkan. Konten tetap bisa diakses dalam mode read-only."
                : "Arsipkan workspace untuk membekukan semua konten. Data tidak akan hilang dan bisa diunarsipkan kapan saja."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={workspace.isArchived ? "default" : "outline"}
              onClick={handleArchive}
              disabled={archiving}
              className="gap-2"
            >
              {archiving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : workspace.isArchived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {workspace.isArchived ? "Unarsipkan Workspace" : "Arsipkan Workspace"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete — Owner only */}
      {workspace.role === "owner" && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Zona Berbahaya
            </CardTitle>
            <CardDescription>
              Menghapus workspace bersifat permanen. Semua data termasuk event,
              task, dan member akan dihapus setelah 30 hari.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Hapus Workspace
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Hapus Workspace
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <span className="block">
                      Tindakan ini tidak bisa dibatalkan. Semua data workspace
                      termasuk event, task, spreadsheet, dan board brainstorming
                      akan dihapus permanen.
                    </span>
                    <span className="block font-medium text-foreground">
                      Ketik <strong>"{workspace.name}"</strong> untuk
                      konfirmasi:
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={workspace.name}
                  className="mt-2"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmName("")}>
                    Batal
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={
                      deleting || deleteConfirmName !== workspace.name
                    }
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
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

