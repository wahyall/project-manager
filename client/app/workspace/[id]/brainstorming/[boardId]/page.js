"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { useBoard } from "@/hooks/use-boards";
import { BoardCanvas } from "@/components/brainstorming/board-canvas";
import { EditBoardDialog } from "@/components/brainstorming/edit-board-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Pin, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function BoardCanvasPage({ params }) {
  const { id, boardId } = use(params);
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const {
    board,
    widgets,
    connections,
    loading,
    error,
    fetchBoard,
    addWidget,
    updateWidget,
    deleteWidget,
    addConnection,
    updateConnection,
    deleteConnection,
  } = useBoard(id, boardId);

  const isReadOnly = currentWorkspace?.isArchived;

  // ── Widget handlers ─────────────────────────────
  const handleAddWidget = useCallback(
    async (widgetData) => {
      try {
        await addWidget(widgetData);
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal menambah widget");
      }
    },
    [addWidget],
  );

  const handleUpdateWidget = useCallback(
    async (widgetId, updates) => {
      try {
        await updateWidget(widgetId, updates);
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal mengupdate widget");
      }
    },
    [updateWidget],
  );

  const handleDeleteWidget = useCallback(
    async (widgetId) => {
      try {
        await deleteWidget(widgetId);
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal menghapus widget");
      }
    },
    [deleteWidget],
  );

  // ── Connection handlers ─────────────────────────
  const handleAddConnection = useCallback(
    async (connectionData) => {
      try {
        await addConnection(connectionData);
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal membuat koneksi");
      }
    },
    [addConnection],
  );

  const handleDeleteConnection = useCallback(
    async (connId) => {
      try {
        await deleteConnection(connId);
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal menghapus koneksi");
      }
    },
    [deleteConnection],
  );

  if (!currentWorkspace) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs">Memuat canvas brainstorming...</p>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] p-4 text-center">
        <h2 className="text-lg font-bold mb-1 text-foreground">Board tidak ditemukan</h2>
        <p className="text-xs text-muted-foreground mb-5 max-w-sm">
          {error || "Board ini mungkin sudah dihapus atau kamu tidak memiliki izin akses."}
        </p>
        <Button onClick={() => router.push(`/workspace/${id}/brainstorming`)} className="rounded-xl text-xs gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Board
        </Button>
      </div>
    );
  }

  const handleUpdateBoard = useCallback(
    async (updates) => {
      try {
        await api.put(`/workspaces/${id}/boards/${boardId}`, updates);
        toast.success("Informasi board berhasil diperbarui");
        fetchBoard();
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal memperbarui board");
        throw err;
      }
    },
    [id, boardId, fetchBoard],
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Board header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/70 bg-background/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8.5 w-8.5 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => router.push(`/workspace/${id}/brainstorming`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate max-w-[240px] sm:max-w-md">
              {board.name}
            </h1>
            {board.isMading && (
              <Badge className="bg-purple-600 hover:bg-purple-600 text-white font-semibold text-2xs gap-1 px-2.5 py-0.5 border-none shrink-0 rounded-full shadow-2xs">
                <Pin className="h-3 w-3" />
                Mading
              </Badge>
            )}
            {isReadOnly && (
              <span className="text-2xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium shrink-0">
                Read-only
              </span>
            )}
          </div>
        </div>

        {!isReadOnly && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 shrink-0 rounded-xl border-border/80 shadow-2xs"
            onClick={() => setEditDialogOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Pengaturan Board</span>
          </Button>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <BoardCanvas
          widgets={widgets}
          connections={connections}
          onAddWidget={handleAddWidget}
          onUpdateWidget={handleUpdateWidget}
          onDeleteWidget={handleDeleteWidget}
          onAddConnection={handleAddConnection}
          onUpdateConnection={updateConnection}
          onDeleteConnection={handleDeleteConnection}
          isReadOnly={isReadOnly}
        />
      </div>

      {/* Edit Board Dialog */}
      <EditBoardDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        board={board}
        onSubmit={handleUpdateBoard}
      />
    </div>
  );
}
