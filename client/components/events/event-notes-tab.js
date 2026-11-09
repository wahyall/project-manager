"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useEventNotes } from "@/hooks/use-event-notes";
import { MentionEditor, MentionReadOnly } from "@/components/mention-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  StickyNote,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

function NoteForm({
  workspaceId,
  initialTitle,
  initialContent,
  onSave,
  onCancel,
  saving,
}) {
  const [title, setTitle] = useState(initialTitle || "");
  const [content, setContent] = useState(initialContent || "");
  const [mentions, setMentions] = useState([]);

  const handleSave = () => {
    if (
      !content ||
      content === "[]" ||
      content === '[{"type":"paragraph","content":[]}]'
    ) {
      toast.error("Isi catatan tidak boleh kosong");
      return;
    }
    onSave({ title, content, mentions });
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xs p-5 shadow-xs space-y-3.5">
      <Input
        placeholder="Judul catatan (opsional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        className="font-semibold text-sm rounded-xl border-border/80 bg-background/80"
      />
      <div className="min-h-[220px] rounded-xl border border-border/80 bg-background/80 py-2.5 px-5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <MentionEditor
          workspaceId={workspaceId}
          initialContent={initialContent}
          onChange={setContent}
          onMentionsChange={setMentions}
          editable={true}
          placeholder="Tulis catatan... gunakan '@' untuk mention"
          minimal={false}
          className="blocknote-compact"
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
          className="h-8.5 rounded-xl text-xs font-semibold"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Batal
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="h-8.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
          Simpan Catatan
        </Button>
      </div>
    </div>
  );
}

function NoteCard({
  note,
  workspaceId,
  currentUserId,
  memberRole,
  onEdit,
  onDelete,
}) {
  const isAuthor = note.authorId?._id === currentUserId;
  const canModify = isAuthor || ["owner", "admin"].includes(memberRole);
  const authorName = note.authorId?.name || "Unknown";
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="group rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs p-4 shadow-xs transition-all hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar className="h-8 w-8 rounded-xl shrink-0 mt-0.5">
            <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary rounded-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground">{authorName}</span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {formatDistanceToNow(new Date(note.createdAt), {
                  addSuffix: true,
                  locale: localeId,
                })}
              </span>
              {note.updatedAt !== note.createdAt && (
                <span className="text-[10px] text-muted-foreground italic">
                  (diedit)
                </span>
              )}
            </div>
            {note.title && (
              <h4 className="text-sm font-bold text-foreground mt-1.5 leading-snug">{note.title}</h4>
            )}
            <div className="mt-2 text-xs leading-relaxed text-foreground/90">
              <MentionReadOnly
                content={note.content}
                className="[&_.bn-editor]:p-0! [&_.bn-block-group]:p-0!"
              />
            </div>
          </div>
        </div>

        {canModify && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-border/80 shadow-xl">
              <DropdownMenuItem
                onClick={() => onEdit(note)}
                className="gap-2 text-xs font-semibold"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Catatan
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(note)}
                className="text-destructive focus:text-destructive gap-2 text-xs font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export function EventNotesTab({ event, workspaceId, members, memberRole }) {
  const { user } = useAuth();
  const { notes, loading, createNote, updateNote, deleteNote } = useEventNotes(
    workspaceId,
    event._id,
  );

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deletingNote, setDeletingNote] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = useCallback(
    async ({ title, content, mentions }) => {
      setSaving(true);
      try {
        await createNote({ title, content, mentions });
        setShowCreateForm(false);
        toast.success("Catatan berhasil ditambahkan");
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal menambahkan catatan");
      } finally {
        setSaving(false);
      }
    },
    [createNote],
  );

  const handleUpdate = useCallback(
    async ({ title, content, mentions }) => {
      if (!editingNote) return;
      setSaving(true);
      try {
        await updateNote(editingNote._id, { title, content, mentions });
        setEditingNote(null);
        toast.success("Catatan berhasil diperbarui");
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal memperbarui catatan");
      } finally {
        setSaving(false);
      }
    },
    [editingNote, updateNote],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingNote) return;
    try {
      await deleteNote(deletingNote._id);
      setDeletingNote(null);
      toast.success("Catatan berhasil dihapus");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus catatan");
    }
  }, [deletingNote, deleteNote]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border/80 bg-card/60 p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {notes.length} Catatan Event
        </h3>
        {!showCreateForm && !editingNote && memberRole !== "guest" && (
          <Button
            size="sm"
            onClick={() => setShowCreateForm(true)}
            className="h-8.5 gap-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Catatan
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <NoteForm
          workspaceId={workspaceId}
          onSave={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          saving={saving}
        />
      )}

      {/* Notes list */}
      {notes.length === 0 && !showCreateForm ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 py-16 text-center">
          <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            <StickyNote className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1">Belum ada catatan</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
            Dokumentasikan notulensi rapat, ide kreatif, atau agenda persiapan event ini.
          </p>
          {memberRole !== "guest" && (
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              className="h-8.5 gap-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Buat Catatan Pertama
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) =>
            editingNote?._id === note._id ? (
              <NoteForm
                key={note._id}
                workspaceId={workspaceId}
                initialTitle={note.title}
                initialContent={note.content}
                onSave={handleUpdate}
                onCancel={() => setEditingNote(null)}
                saving={saving}
              />
            ) : (
              <NoteCard
                key={note._id}
                note={note}
                workspaceId={workspaceId}
                currentUserId={user?._id}
                memberRole={memberRole}
                onEdit={setEditingNote}
                onDelete={setDeletingNote}
              />
            ),
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingNote}
        onOpenChange={(open) => !open && setDeletingNote(null)}
      >
        <AlertDialogContent className="rounded-2xl border-border/80 bg-card/95 backdrop-blur-md shadow-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Hapus Catatan</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Apakah kamu yakin ingin menghapus catatan
              {deletingNote?.title ? ` "${deletingNote.title}"` : " ini"}?
              Tindakan ini permanen dan tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="h-9 rounded-xl text-xs font-semibold">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-9 rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}