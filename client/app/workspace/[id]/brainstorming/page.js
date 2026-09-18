"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { useBoards } from "@/hooks/use-boards";
import { BoardCard } from "@/components/brainstorming/board-card";
import { CreateBoardDialog } from "@/components/brainstorming/create-board-dialog";
import { EditBoardDialog } from "@/components/brainstorming/edit-board-dialog";
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

  // Edit Board state
  const [editingBoard, setEditingBoard] = useState(null);

  // Delete state
  const [deleteBoardTarget, setDeleteBoardTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isReadOnly = currentWorkspace?.isArchived;

  // ── Handlers ──────────────────────────────────────
  const handleCreate = useCallback(
    async (boardData) => {
      try {
        const board = await createBoard(boardData);
        toast.success("Board berhasil dibuat");
        router.push(`/workspace/${id}/brainstorming/${board._id}`);
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal membuat board");
        throw err;
      }
    },
    [createBoard, router, id],
  );

  const handleEditBoard = useCallback(
    async (updates) => {
      if (!editingBoard) return;
      try {
        await updateBoard(editingBoard._id, updates);
        toast.success("Board berhasil diperbarui");
        setEditingBoard(null);
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal memperbarui board");
        throw err;
      }
    },
    [editingBoard, updateBoard],
  );

  const handleToggleMading = useCallback(
    async (board) => {
      try {
        const newStatus = !board.isMading;
        await updateBoard(board._id, { isMading: newStatus });
        toast.success(
          newStatus
            ? `"${board.name}" dijadikan Mading Workspace`
            : `"${board.name}" dihapus dari Mading Workspace`,
        );
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Gagal mengubah status Mading",
        );
      }
    },
    [updateBoard],
  );

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
              onEdit={() => setEditingBoard(board)}
              onToggleMading={() => handleToggleMading(board)}
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

      {/* Edit board dialog */}
      <EditBoardDialog
        open={!!editingBoard}
        onOpenChange={(open) => !open && setEditingBoard(null)}
        board={editingBoard}
        onSubmit={handleEditBoard}
      />

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
