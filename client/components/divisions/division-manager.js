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

/**
 * DivisionManager: shared UI for Workspace divisions page and
 * Event divisions section. Same hierarchy, same labels, same states.
 *
 * Shape rule: outer cards rounded-xl, inner panels rounded-lg,
 * buttons and inputs default radius. One accent: primary.
 * Division color appears only as left bar and select dot.
 * Amber appears only for Ketua badge (semantic state).
 */
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
      <Card>
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Gagal memuat divisi</AlertTitle>
            <AlertDescription className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm">{error}</span>
              {onRetry && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRetry}>
                  Coba lagi
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold leading-tight">
                  {title} ({divisions.length})
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {divisions.length === 0
                    ? subtitle
                    : `${stats.unique} anggota, ${stats.leaders} ketua${stats.empty > 0 ? `, ${stats.empty} divisi kosong` : ""}${stats.noLeader > 0 ? `, ${stats.noLeader} tanpa ketua` : ""}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {divisions.length > 0 && (
                <div className="relative flex-1 lg:w-56 lg:flex-none">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari divisi atau anggota"
                    aria-label="Cari divisi atau anggota"
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              )}
              <Button
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-3 text-xs"
                onClick={() => setShowCreateForm((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Divisi
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-3 sm:p-4">
          {showCreateForm && (
            <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-division-name">Nama divisi</Label>
                <Input
                  id="new-division-name"
                  placeholder="Contoh: Acara, Konsumsi, Media"
                  value={newDivName}
                  onChange={(e) => setNewDivName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setShowCreateForm(false);
                  }}
                  className="h-9 bg-background text-sm"
                  maxLength={100}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium">Warna penanda</span>
                <div className="flex flex-wrap gap-1.5">
                  {DIVISION_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewDivColor(c)}
                      aria-label={`Pilih warna ${c}`}
                      aria-pressed={newDivColor === c}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-all",
                        newDivColor === c
                          ? "scale-110 border-foreground"
                          : "border-transparent hover:scale-105",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleCreate}
                  disabled={!newDivName.trim()}
                >
                  Buat
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowCreateForm(false)}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          {divisions.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-semibold">Belum ada divisi</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                {subtitle} Gunakan tombol Tambah Divisi di atas untuk membuat
                yang pertama.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-semibold">Tidak ada hasil</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Tidak ada divisi atau anggota yang cocok dengan {query}.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-8 text-xs"
                onClick={() => setQuery("")}
              >
                Hapus pencarian
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {query.trim() && (
                <p className="text-xs text-muted-foreground">
                  Menampilkan {filtered.length} dari {divisions.length} divisi
                </p>
              )}
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
                  >
                    <div className="flex overflow-hidden rounded-xl border bg-card">
                      <div
                        className="w-1 shrink-0"
                        style={{ backgroundColor: div.color || "var(--muted)" }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 px-2.5 py-2">
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              aria-label={isOpen ? `Tutup ${div.name}` : `Buka ${div.name}`}
                              className="rounded-md p-1.5 transition-colors hover:bg-accent"
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                                className="h-8 min-w-36 flex-1 text-sm"
                                maxLength={100}
                                aria-label="Nama divisi"
                                autoFocus
                              />
                              <div className="flex gap-1">
                                {DIVISION_COLORS.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setEditColor(c)}
                                    aria-label={`Pilih warna ${c}`}
                                    aria-pressed={editColor === c}
                                    className={cn(
                                      "h-5 w-5 rounded-full border-2 transition-all",
                                      editColor === c
                                        ? "scale-110 border-foreground"
                                        : "border-transparent hover:scale-105",
                                    )}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <Button
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => handleUpdate(div._id)}
                                disabled={!editName.trim()}
                              >
                                Simpan
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setEditingDiv(null)}
                              >
                                Batal
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold leading-tight">
                                  {div.name}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {memberList.length === 0
                                    ? "Kosong, belum ada anggota"
                                    : leaders.length > 0
                                      ? `Ketua: ${leaders.map((l) => getName(l)).join(", ")}`
                                      : `${memberList.length} anggota, belum ada ketua`}
                                </p>
                              </div>
                              <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px]">
                                {memberList.length}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 shrink-0 gap-1 px-2 text-[11px]"
                                onClick={() =>
                                  adding ? setAddMemberDivId(null) : openAddMember(div._id)
                                }
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Tambah</span>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    aria-label={`Opsi ${div.name}`}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingDiv(div._id);
                                      setEditName(div.name);
                                      setEditColor(div.color || DIVISION_COLORS[0]);
                                    }}
                                    className="gap-2 text-sm"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit Divisi
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setConfirmDeleteDiv(div)}
                                    className="gap-2 text-sm text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Hapus Divisi
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>

                        <CollapsibleContent>
                          <Separator />
                          <div className="space-y-1 p-2.5">
                            {adding && (
                              <div className="space-y-2 rounded-lg bg-muted/50 p-2.5">
                                <Label htmlFor={`search-${div._id}`}>
                                  Tambah anggota ke {div.name}
                                </Label>
                                <Input
                                  id={`search-${div._id}`}
                                  placeholder={memberSearchHint}
                                  value={memberSearch}
                                  onChange={(e) => setMemberSearch(e.target.value)}
                                  className="h-8 bg-background text-sm"
                                  autoFocus
                                />
                                {allowAddAsLeader && (
                                  <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
                                    <input
                                      type="checkbox"
                                      checked={addAsLeader}
                                      onChange={(e) => setAddAsLeader(e.target.checked)}
                                      className="h-3.5 w-3.5 accent-amber-500"
                                    />
                                    Tambahkan sebagai ketua divisi
                                  </label>
                                )}
                                <div className="max-h-44 space-y-0.5 overflow-y-auto">
                                  {available.length > 0 ? (
                                    available.slice(0, 12).map((m) => {
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
                                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
                                        >
                                          <Avatar className="h-6 w-6 shrink-0">
                                            <AvatarFallback className="bg-primary/10 text-[9px] font-medium text-primary">
                                              {initials(uname)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-medium">
                                              {uname}
                                            </span>
                                            {uemail && (
                                              <span className="block truncate text-[11px] text-muted-foreground">
                                                {uemail}
                                              </span>
                                            )}
                                          </span>
                                          <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <p className="py-2 text-center text-xs text-muted-foreground">
                                      {memberSearch
                                        ? "Tidak ada member yang cocok"
                                        : "Semua member sudah masuk divisi ini"}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[11px] text-muted-foreground">
                                    {available.length} tersedia
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[11px]"
                                    onClick={() => setAddMemberDivId(null)}
                                  >
                                    Tutup
                                  </Button>
                                </div>
                              </div>
                            )}

                            {memberList.length > 0 ? (
                              memberList.map((m) => {
                                const uid = getUid(m);
                                const name = getName(m);
                                const email = getEmail(m);
                                const isLeader = m.role === "leader";
                                return (
                                  <div
                                    key={uid}
                                    className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-accent/50"
                                  >
                                    <Avatar className="h-7 w-7 shrink-0">
                                      <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                                        {initials(name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-[13px] font-medium leading-tight">
                                        {name}
                                      </p>
                                      {email ? (
                                        <p className="truncate text-[11px] text-muted-foreground">
                                          {email}
                                        </p>
                                      ) : null}
                                    </div>
                                    {isLeader ? (
                                      <Badge className="h-5 shrink-0 gap-1 bg-amber-500/15 px-1.5 text-[10px] font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
                                        <Crown className="h-3 w-3" />
                                        Ketua
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px] font-normal text-muted-foreground">
                                        Anggota
                                      </Badge>
                                    )}
                                    <div className="flex shrink-0 items-center transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleRole(div._id, uid, m.role)}
                                        title={isLeader ? "Jadikan anggota" : "Jadikan ketua"}
                                        aria-label={isLeader ? `Jadikan ${name} anggota` : `Jadikan ${name} ketua`}
                                        className="rounded-md p-1.5 transition-colors hover:bg-accent"
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
                                          title="Pindah divisi"
                                          aria-label={`Pindahkan ${name} ke divisi lain`}
                                          className="rounded-md p-1.5 transition-colors hover:bg-accent"
                                        >
                                          <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMember(div._id, uid)}
                                        title="Keluarkan dari divisi"
                                        aria-label={`Keluarkan ${name} dari ${div.name}`}
                                        className="rounded-md p-1.5 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="flex flex-col items-center rounded-lg border border-dashed px-4 py-5 text-center">
                                <p className="text-xs font-medium">Divisi ini masih kosong</p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  Tambahkan member agar divisi siap bertugas
                                </p>
                                {!adding && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2.5 h-7 gap-1.5 text-[11px]"
                                    onClick={() => openAddMember(div._id)}
                                  >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    Tambah
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!movingMember}
        onOpenChange={(open) => {
          if (!open) {
            setMovingMember(null);
            setMoveTargetDiv("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Pindah anggota</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              Pindahkan <span className="font-medium text-foreground">{movingMember?.name}</span> dari{" "}
              <span className="font-medium text-foreground">{movingMember?.divisionName}</span> ke divisi berikut.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="move-target">Divisi tujuan</Label>
              <Select value={moveTargetDiv} onValueChange={setMoveTargetDiv}>
                <SelectTrigger id="move-target" className="h-9">
                  <SelectValue placeholder="Pilih divisi tujuan" />
                </SelectTrigger>
                <SelectContent>
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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMovingMember(null)}>
              Batal
            </Button>
            <Button onClick={handleMoveMember} disabled={!moveTargetDiv}>
              Pindahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDeleteDiv}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteDiv(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {confirmDeleteDiv?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Divisi dihapus dan {(confirmDeleteDiv?.members || []).length} anggota keluar dari divisi ini.
              Anggota tetap menjadi member workspace atau event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
