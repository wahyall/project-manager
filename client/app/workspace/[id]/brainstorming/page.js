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
import { Lightbulb, Plus, Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function BrainstormingPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const {
    boards,
    loading,
    fetchBoards,
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
        fetchBoards(true);
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal memperbarui board");
        throw err;
      }
    },
    [editingBoard, updateBoard, fetchBoards],
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
        fetchBoards(true);
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Gagal mengubah status Mading",
        );
      }
    },
    [updateBoard, fetchBoards],
  );

  const handleDuplicate = useCallback(
    async (board) => {
      try {
        await duplicateBoard(board._id);
        toast.success("Board berhasil diduplikasi");
        fetchBoards(true);
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal duplikasi board");
      }
    },
    [duplicateBoard, fetchBoards],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteBoardTarget || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await deleteBoard(deleteBoardTarget._id);
      toast.success("Board berhasil dihapus");
      setDeleteBoardTarget(null);
      fetchBoards(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus board");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteBoardTarget, deleteLoading, deleteBoard, fetchBoards]);

  // ── Filter boards ─────────────────────────────────
  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!currentWorkspace) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Kolaborasi Visual
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
              <Lightbulb className="h-5 w-5" />
            </div>
            Brainstorming Boards
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Papan kanvas interaktif untuk eksplorasi konsep, mind-map, diagram alir, dan mading tim
          </p>
        </div>

        {!isReadOnly && (
          <Button
            className="gap-2 rounded-xl h-10 px-4 text-xs font-semibold shadow-md self-start sm:self-auto active:scale-95 transition-all"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Buat Board Baru</span>
          </Button>
        )}
      </div>

      {/* Search */}
      {boards.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Cari nama board..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-card/80 border-border/80 text-xs focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-semibold">Memuat daftar papan brainstorming...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && boards.length === 0 && (
        <div className="rounded-2xl border border-border/80 bg-card/70 shadow-xs backdrop-blur-xs flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-4 shadow-2xs">
            <Lightbulb className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">
            Belum Ada Board Brainstorming
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
            Mulai buat board pertama untuk mendesain arsitektur ide, membuat sticky notes, atau menyematkan mading informasi.
          </p>
          {!isReadOnly && (
            <Button
              className="gap-2 rounded-xl text-xs font-semibold shadow-xs"
              onClick={() => setCreateDialogOpen(true)}
            >
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
        <div className="text-center py-16 text-muted-foreground text-xs border border-dashed border-border/80 rounded-2xl">
          <p className="font-semibold text-foreground">
            Tidak ada board yang cocok dengan pencarian &quot;{searchQuery}&quot;
          </p>
          <p className="text-muted-foreground mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
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
        <AlertDialogContent className="rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-destructive">
              Hapus Board Brainstorming?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
              Yakin hapus board &quot;{deleteBoardTarget?.name}&quot;? Seluruh widget, sticky note, dan diagram koneksi di dalamnya akan terhapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel className="rounded-xl text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-semibold"
              disabled={deleteLoading}
            >
              {deleteLoading && (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              )}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
