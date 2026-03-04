"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { useBoards } from "@/hooks/use-boards";
import { BoardCard } from "@/components/brainstorming/board-card";
import { CreateBoardDialog } from "@/components/brainstorming/create-board-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Lightbulb, Plus, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export default function BrainstormingPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const {
    boards,
    loading,
    createBoard,
    updateBoard,
    deleteBoard,
    duplicateBoard,
  } = useBoards(id);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Rename state
  const [renameBoard, setRenameBoard] = useState(null);
  const [renameName, setRenameName] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  // Delete state
  const [deleteBoardTarget, setDeleteBoardTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isReadOnly = currentWorkspace?.isArchived;

  // ── Handlers ──────────────────────────────────────
  const handleCreate = useCallback(
    async (name) => {
      try {
        const board = await createBoard(name);
        toast.success("Board berhasil dibuat");
        router.push(`/workspace/${id}/brainstorming/${board._id}`);
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal membuat board");
        throw err;
      }
    },
    [createBoard, router, id],
  );

  const handleRename = useCallback(async () => {
    if (!renameBoard || !renameName.trim() || renameLoading) return;
    setRenameLoading(true);
    try {
      await updateBoard(renameBoard._id, { name: renameName.trim() });
      toast.success("Board berhasil direname");
      setRenameBoard(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal rename board");
    } finally {
      setRenameLoading(false);
    }
  }, [renameBoard, renameName, renameLoading, updateBoard]);

  const handleDuplicate = useCallback(
    async (board) => {
      try {
        await duplicateBoard(board._id);
        toast.success("Board berhasil diduplikasi");
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal duplikasi board");
      }
    },
    [duplicateBoard],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteBoardTarget || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await deleteBoard(deleteBoardTarget._id);
      toast.success("Board berhasil dihapus");
      setDeleteBoardTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus board");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteBoardTarget, deleteLoading, deleteBoard]);

  // ── Filter boards ─────────────────────────────────
  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!currentWorkspace) return null;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            Brainstorming
          </h1>
          <p className="text-muted-foreground mt-1">
            Catat ide, diskusi, dan rencana bersama tim
          </p>
        </div>
        {!isReadOnly && (
          <Button
            className="gap-2 shadow-sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Buat Board Baru
          </Button>
        )}
      </div>

      {/* Search */}
      {boards.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari board..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && boards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 mb-6">
            <Lightbulb className="h-10 w-10 text-amber-500/60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Belum ada board
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Buat board brainstorming pertama untuk mulai mengumpulkan ide
            bersama tim.
          </p>
          {!isReadOnly && (
            <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Buat Board Pertama
            </Button>
          )}
        </div>
      )}

      {/* Board grid */}
      {!loading && filteredBoards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBoards.map((board) => (
            <BoardCard
              key={board._id}
              board={board}
              onClick={() =>
                router.push(`/workspace/${id}/brainstorming/${board._id}`)
              }
              onRename={() => {
                setRenameBoard(board);
                setRenameName(board.name);
              }}
              onDuplicate={() => handleDuplicate(board)}
              onDelete={() => setDeleteBoardTarget(board)}
            />
          ))}
        </div>
      )}

      {/* No search results */}
      {!loading && boards.length > 0 && filteredBoards.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>
            Tidak ada board yang cocok dengan pencarian &quot;{searchQuery}
            &quot;
          </p>
        </div>
      )}

      {/* Create dialog */}
      <CreateBoardDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
      />

      {/* Rename dialog */}
      <Dialog
        open={!!renameBoard}
        onOpenChange={(open) => !open && setRenameBoard(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-input">Nama Board</Label>
              <Input
                id="rename-input"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                maxLength={100}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameBoard(null)}>
              Batal
            </Button>
            <Button
              onClick={handleRename}
              disabled={!renameName.trim() || renameLoading}
            >
              {renameLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteBoardTarget}
        onOpenChange={(open) => !open && setDeleteBoardTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Board?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin hapus board &quot;{deleteBoardTarget?.name}&quot;? Board
              akan dihapus beserta semua widget di dalamnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLoading}
            >
              {deleteLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
