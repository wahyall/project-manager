"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Crown,
  ArrowRightLeft,
  TriangleAlert,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const DIVISION_COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#F97316",
];

function initials(name) {
  if (!name || name === "Unknown") return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}

function getUid(m) {
  const u = m?.userId;
  if (u && typeof u === "object") return u._id?.toString();
  return (u || m?._id)?.toString();
}

function getName(m) {
  if (m && typeof m.userId === "object") return m.userId?.name || "Unknown";
  return m?.name || "Unknown";
}

function getEmail(m) {
  if (m && typeof m.userId === "object") return m.userId?.email || "";
  return m?.email || "";
}

export function DivisionManager({
  title,
  subtitle,
  divisions = [],
  loading = false,
  error = null,
  onRetry,
  members = [],
  allowAddAsLeader = false,
  actions,
  memberSearchHint = "Cari nama atau email member",
}) {
  const [query, setQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDivName, setNewDivName] = useState("");
  const [newDivColor, setNewDivColor] = useState(DIVISION_COLORS[0]);

  const [editingDiv, setEditingDiv] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const [addMemberDivId, setAddMemberDivId] = useState(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [addAsLeader, setAddAsLeader] = useState(false);

  const [movingMember, setMovingMember] = useState(null);
  const [moveTargetDiv, setMoveTargetDiv] = useState("");
  const [confirmDeleteDiv, setConfirmDeleteDiv] = useState(null);

  const [openDivisions, setOpenDivisions] = useState({});

  const stats = useMemo(() => {
    const ids = divisions.flatMap((d) =>
      (d.members || []).map((m) => getUid(m)).filter(Boolean),
    );
    const unique = new Set(ids).size;
    const leaders = divisions.flatMap((d) =>
      (d.members || []).filter((m) => m.role === "leader"),
    ).length;
    const empty = divisions.filter((d) => (d.members || []).length === 0).length;
    const noLeader = divisions.filter(
      (d) =>
        (d.members || []).length > 0 &&
        !(d.members || []).some((m) => m.role === "leader"),
    ).length;
    return { unique, leaders, empty, noLeader };
  }, [divisions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return divisions;
    return divisions.filter((d) => {
      if (d.name?.toLowerCase().includes(q)) return true;
      return (d.members || []).some(
        (m) =>
          getName(m).toLowerCase().includes(q) ||
          getEmail(m).toLowerCase().includes(q),
      );
    });
  }, [divisions, query]);

  const toggleDivision = (divId) =>
    setOpenDivisions((prev) => ({ ...prev, [divId]: !(prev[divId] !== false) }));

  const openAddMember = (divId) => {
    setAddMemberDivId(divId);
    setMemberSearch("");
    setAddAsLeader(false);
  };

  const availableMembers = (divisionId) => {
    const div = divisions.find((d) => d._id === divisionId);
    const taken = new Set((div?.members || []).map((m) => getUid(m)));
    const q = memberSearch.trim().toLowerCase();
    return members.filter((m) => {
      const uid =
        typeof m.userId === "object"
          ? m.userId?._id?.toString()
          : (m.userId || m._id)?.toString();
      if (!uid || taken.has(uid)) return false;
      if (!q) return true;
      const nm =
        typeof m.userId === "object" ? m.userId?.name : m.name;
      const em =
        typeof m.userId === "object" ? m.userId?.email : m.email;
      return (
        nm?.toLowerCase().includes(q) || em?.toLowerCase().includes(q)
      );
    });
  };

  const handleCreate = async () => {
    if (!newDivName.trim()) return;
    const name = newDivName.trim();
    try {
      await actions.createDivision({ name, color: newDivColor });
      setNewDivName("");
      setNewDivColor(DIVISION_COLORS[0]);
      setShowCreateForm(false);
      toast.success(`Divisi ${name} berhasil dibuat`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal membuat divisi");
    }
  };

  const handleUpdate = async (divisionId) => {
    if (!editName.trim()) return;
    try {
      await actions.updateDivision(divisionId, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingDiv(null);
      toast.success("Divisi berhasil diperbarui");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memperbarui divisi");
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteDiv) return;
    const div = confirmDeleteDiv;
    setConfirmDeleteDiv(null);
    try {
      await actions.deleteDivision(div._id);
      toast.success(`Divisi ${div.name} berhasil dihapus`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus divisi");
    }
  };

  const handleAddMember = async (divisionId, memberId) => {
    try {
      await actions.addMember(
        divisionId,
        memberId,
        allowAddAsLeader && addAsLeader ? "leader" : "member",
      );
      setMemberSearch("");
      setAddAsLeader(false);
      toast.success("Anggota berhasil ditambahkan");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menambahkan anggota");
    }
  };

  const handleToggleRole = async (divisionId, userId, currentRole) => {
    try {
      await actions.updateMemberRole(
        divisionId,
        userId,
        currentRole === "leader" ? "member" : "leader",
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengubah role");
    }
  };

  const handleRemoveMember = async (divisionId, userId) => {
    try {
      await actions.removeMember(divisionId, userId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus anggota");
    }
  };

  const handleMoveMember = async () => {
    if (!movingMember || !moveTargetDiv) return;
    const { divisionId, userId } = movingMember;
    setMovingMember(null);
    setMoveTargetDiv("");
    try {
      await actions.moveMember(divisionId, userId, moveTargetDiv);
      toast.success("Anggota berhasil dipindahkan");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memindahkan anggota");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-64 rounded-md" />
          </div>
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">Gagal memuat divisi</p>
        </div>
        <p className="text-xs mt-1">{error}</p>
        {onRetry && (
          <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl mt-3" onClick={onRetry}>
            Coba lagi
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action and Metrics bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">
              {title} ({divisions.length})
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {divisions.length === 0
                ? subtitle
                : `${stats.unique} anggota relasi &bull; ${stats.leaders} ketua divisi${stats.empty > 0 ? ` &bull; ${stats.empty} kosong` : ""}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {divisions.length > 0 && (
            <div className="relative flex-1 sm:w-56 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari divisi / anggota..."
                className="h-9 pl-8.5 rounded-xl text-xs bg-background/50 border-border/80"
              />
            </div>
          )}
          <Button
            size="sm"
            className="h-9 shrink-0 gap-1.5 px-3.5 rounded-xl text-xs shadow-xs"
            onClick={() => setShowCreateForm((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Divisi</span>
          </Button>
        </div>
      </div>

      {/* Inline Create Form */}
      {showCreateForm && (
        <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              Buat Divisi Baru
            </h4>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-division-name" className="text-xs font-semibold text-foreground">
              Nama Divisi
            </Label>
            <Input
              id="new-division-name"
              placeholder="Contoh: Media & Komunikasi, Acara & Logistik..."
              value={newDivName}
              onChange={(e) => setNewDivName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowCreateForm(false);
              }}
              className="h-10 rounded-xl bg-background/70 text-sm border-border/80"
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground block">
              Pilih Warna Penanda
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {DIVISION_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewDivColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-lg border transition-all",
                    newDivColor === c
                      ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background border-transparent"
                      : "border-border/50 hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="h-9 rounded-xl text-xs px-4"
              onClick={handleCreate}
              disabled={!newDivName.trim()}
            >
              Simpan Divisi
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl text-xs"
              onClick={() => setShowCreateForm(false)}
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Empty States */}
      {divisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-2xs">
            <Users className="h-7 w-7" />
          </div>
          <h4 className="text-base font-bold text-foreground">Belum ada divisi</h4>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground mb-4">
            {subtitle} Mulai susun struktur kepanitiaan atau departemen dengan tombol di atas.
          </p>
          <Button
            size="sm"
            className="rounded-xl h-9 text-xs gap-1.5"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="h-4 w-4" />
            Buat Divisi Pertama
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-border/80 bg-card/40">
          <Search className="h-8 w-8 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-semibold text-foreground">Tidak ditemukan hasil</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tidak ada divisi atau anggota yang cocok dengan kata kunci &quot;{query}&quot;.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 h-8 text-xs rounded-xl"
            onClick={() => setQuery("")}
          >
            Bersihkan Pencarian
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((div) => {
            const isOpen = openDivisions[div._id] !== false;
            const isEditing = editingDiv === div._id;
            const memberList = [...(div.members || [])].sort((a, b) =>
              a.role === b.role ? getName(a).localeCompare(getName(b)) : a.role === "leader" ? -1 : 1,
            );
            const leaders = memberList.filter((m) => m.role === "leader");
            const adding = addMemberDivId === div._id;
            const available = adding ? availableMembers(div._id) : [];

            return (
              <Collapsible
                key={div._id}
                open={isOpen}
                onOpenChange={() => toggleDivision(div._id)}
                className="flex flex-col rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xs shadow-xs overflow-hidden transition-all hover:border-primary/40"
              >
                {/* Accent line top */}
                <div
                  className="h-1.5 w-full shrink-0"
                  style={{ backgroundColor: div.color || "var(--primary)" }}
                />

                {/* Division Header */}
                <div className="p-4 flex items-center justify-between gap-2.5 border-b border-border/60">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        aria-label={isOpen ? `Tutup ${div.name}` : `Buka ${div.name}`}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted/80 transition-colors"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </CollapsibleTrigger>

                    {isEditing ? (
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 py-0.5">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(div._id);
                            if (e.key === "Escape") setEditingDiv(null);
                          }}
                          className="h-8 min-w-36 flex-1 text-xs rounded-lg"
                          maxLength={100}
                          autoFocus
                        />
                        <div className="flex gap-1">
                          {DIVISION_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className={cn(
                                "h-5 w-5 rounded-md border transition-all",
                                editColor === c
                                  ? "ring-2 ring-primary ring-offset-1 border-transparent"
                                  : "border-transparent hover:scale-105",
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <Button
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          onClick={() => handleUpdate(div._id)}
                          disabled={!editName.trim()}
                        >
                          Simpan
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          onClick={() => setEditingDiv(null)}
                        >
                          Batal
                        </Button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground truncate">
                            {div.name}
                          </h4>
                          <Badge variant="outline" className="text-2xs font-semibold px-2 py-0 h-4.5 rounded-full border-border/80">
                            {memberList.length}
                          </Badge>
                        </div>
                        <p className="text-2xs text-muted-foreground truncate mt-0.5">
                          {memberList.length === 0
                            ? "Belum ada anggota"
                            : leaders.length > 0
                            ? `Ketua: ${leaders.map((l) => getName(l)).join(", ")}`
                            : `${memberList.length} anggota, belum ada ketua`}
                        </p>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-2xs font-semibold rounded-lg px-2 gap-1 text-primary hover:bg-primary/10"
                        onClick={() =>
                          adding ? setAddMemberDivId(null) : openAddMember(div._id)
                        }
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Anggota</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-40 shadow-lg">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingDiv(div._id);
                              setEditName(div.name);
                              setEditColor(div.color || DIVISION_COLORS[0]);
                            }}
                            className="gap-2 text-xs rounded-lg"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Ubah Divisi
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setConfirmDeleteDiv(div)}
                            className="gap-2 text-xs rounded-lg text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus Divisi
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {/* Collapsible Content */}
                <CollapsibleContent>
                  <div className="p-3.5 space-y-2">
                    {/* Add Member Drawer Box */}
                    {adding && (
                      <div className="space-y-2.5 rounded-xl bg-muted/40 border border-border/80 p-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`search-${div._id}`} className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                            Tambah Anggota ke {div.name}
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-2xs px-2"
                            onClick={() => setAddMemberDivId(null)}
                          >
                            Tutup
                          </Button>
                        </div>
                        <Input
                          id={`search-${div._id}`}
                          placeholder={memberSearchHint}
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="h-8.5 rounded-xl bg-background/80 text-xs"
                          autoFocus
                        />
                        {allowAddAsLeader && (
                          <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground font-medium">
                            <input
                              type="checkbox"
                              checked={addAsLeader}
                              onChange={(e) => setAddAsLeader(e.target.checked)}
                              className="h-3.5 w-3.5 rounded text-amber-500"
                            />
                            Tambahkan langsung sebagai Ketua Divisi
                          </label>
                        )}
                        <div className="max-h-40 space-y-1 overflow-y-auto soft-scrollbar">
                          {available.length > 0 ? (
                            available.slice(0, 10).map((m) => {
                              const uid =
                                typeof m.userId === "object"
                                  ? m.userId?._id
                                  : m.userId || m._id;
                              const uname =
                                typeof m.userId === "object"
                                  ? m.userId?.name
                                  : m.name;
                              const uemail =
                                typeof m.userId === "object"
                                  ? m.userId?.email
                                  : m.email;
                              if (!uid) return null;
                              return (
                                <button
                                  key={uid.toString()}
                                  type="button"
                                  onClick={() => handleAddMember(div._id, uid)}
                                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-muted text-xs group"
                                >
                                  <Avatar className="h-6 w-6 rounded-full shrink-0">
                                    <AvatarFallback className="bg-primary/10 text-[9px] font-bold text-primary">
                                      {initials(uname)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="min-w-0 flex-1 truncate">
                                    <span className="font-semibold text-foreground block truncate">
                                      {uname}
                                    </span>
                                    {uemail && (
                                      <span className="text-2xs text-muted-foreground block truncate">
                                        {uemail}
                                      </span>
                                    )}
                                  </span>
                                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                                </button>
                              );
                            })
                          ) : (
                            <p className="py-3 text-center text-xs text-muted-foreground">
                              {memberSearch
                                ? "Tidak ada member yang cocok"
                                : "Semua member sudah masuk ke divisi ini"}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Member List */}
                    {memberList.length > 0 ? (
                      <div className="space-y-1">
                        {memberList.map((m) => {
                          const uid = getUid(m);
                          const name = getName(m);
                          const email = getEmail(m);
                          const isLeader = m.role === "leader";
                          return (
                            <div
                              key={uid}
                              className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted/40 text-xs"
                            >
                              <Avatar className="h-7 w-7 rounded-full shrink-0">
                                <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                                  {initials(name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-foreground">
                                  {name}
                                </p>
                                {email && (
                                  <p className="truncate text-2xs text-muted-foreground">
                                    {email}
                                  </p>
                                )}
                              </div>
                              {isLeader ? (
                                <Badge className="h-5 shrink-0 gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 text-2xs font-semibold rounded-full shadow-2xs">
                                  <Crown className="h-3 w-3" />
                                  Ketua
                                </Badge>
                              ) : (
                                <span className="text-2xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60">
                                  Anggota
                                </span>
                              )}
                              <div className="flex shrink-0 items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleToggleRole(div._id, uid, m.role)}
                                  title={isLeader ? "Jadikan anggota biasa" : "Jadikan ketua divisi"}
                                  className="rounded-lg p-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-amber-500"
                                >
                                  <Crown
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      isLeader ? "text-amber-500" : "text-muted-foreground",
                                    )}
                                  />
                                </button>
                                {divisions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMovingMember({
                                        divisionId: div._id,
                                        userId: uid,
                                        name,
                                        divisionName: div.name,
                                      })
                                    }
                                    title="Pindahkan ke divisi lain"
                                    className="rounded-lg p-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
                                  >
                                    <ArrowRightLeft className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(div._id, uid)}
                                  title="Keluarkan dari divisi"
                                  className="rounded-lg p-1.5 transition-colors hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-border/80">
                        <p className="text-xs font-semibold text-foreground">Divisi belum memiliki anggota</p>
                        <p className="text-2xs text-muted-foreground mt-0.5">
                          Tugaskan personil tim ke divisi ini agar koordinasi berjalan
                        </p>
                        {!adding && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2.5 h-7.5 rounded-lg text-2xs gap-1"
                            onClick={() => openAddMember(div._id)}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Tambah Anggota
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Move Member Dialog */}
      <Dialog
        open={!!movingMember}
        onOpenChange={(open) => {
          if (!open) {
            setMovingMember(null);
            setMoveTargetDiv("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Pindah Divisi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Pindahkan <strong className="text-foreground">{movingMember?.name}</strong> dari{" "}
              <strong className="text-foreground">{movingMember?.divisionName}</strong> ke divisi tujuan:
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="move-target" className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                Divisi Baru
              </Label>
              <Select value={moveTargetDiv} onValueChange={setMoveTargetDiv}>
                <SelectTrigger id="move-target" className="h-9 rounded-xl text-xs bg-background/50">
                  <SelectValue placeholder="Pilih divisi tujuan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {divisions
                    .filter((d) => d._id !== movingMember?.divisionId)
                    .map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        <span className="flex items-center gap-2">
                          {d.color && (
                            <span
                              className="inline-block h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: d.color }}
                            />
                          )}
                          {d.name}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="ghost" className="rounded-xl text-xs" onClick={() => setMovingMember(null)}>
              Batal
            </Button>
            <Button className="rounded-xl text-xs shadow-xs" onClick={handleMoveMember} disabled={!moveTargetDiv}>
              Pindahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Division Dialog */}
      <AlertDialog
        open={!!confirmDeleteDiv}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteDiv(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive">
              Hapus Divisi {confirmDeleteDiv?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Divisi ini akan dihapus permanen. Sebanyak {(confirmDeleteDiv?.members || []).length} anggota yang terdaftar akan dilepaskan dari divisi ini tanpa menghapus akun mereka dari workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel className="rounded-xl text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 rounded-xl text-xs"
              onClick={handleConfirmDelete}
            >
              Hapus Divisi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
