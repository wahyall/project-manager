"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/workspace-context";
import { useBoard } from "@/hooks/use-boards";
import { BoardCanvas } from "@/components/brainstorming/board-canvas";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BoardCanvasPage({ params }) {
  const { id, boardId } = use(params);
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const {
    board,
    widgets,
    connections,
    loading,
    error,
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
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] p-4">
        <h2 className="text-xl font-semibold mb-2">Board tidak ditemukan</h2>
        <p className="text-muted-foreground mb-6">
          {error || "Board ini mungkin sudah dihapus."}
        </p>
        <Button onClick={() => router.push(`/workspace/${id}/brainstorming`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar Board
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Board header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background/80 backdrop-blur-sm shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push(`/workspace/${id}/brainstorming`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold truncate">{board.name}</h1>
        {isReadOnly && (
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            Read-only
          </span>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1">
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
    </div>
  );
}
