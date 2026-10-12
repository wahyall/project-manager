"use client";

import { useState, useCallback } from "react";
import { useWorkspaceDivisions } from "@/hooks/use-workspace-divisions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Crown,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DIVISION_COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#F97316",
];

/**
 * WorkspaceDivisionsSection — Kelola Divisi Workspace.
 * BERBEDA dari Divisi Event: divisi ini milik workspace,
 * diisi dari member workspace, dengan ketua (leader) per divisi.
 *
 * Alur: buat divisi (Nama + Warna) → tambahkan member → assign ketua.
 */
export function WorkspaceDivisionsSection({ workspaceId, members = [] }) {
  const {
    divisions,
    loading,
    createDivision,
    updateDivision,
    deleteDivision,
    addMember,
    updateMemberRole,
    removeMember,
    moveMember,
  } = useWorkspaceDivisions(workspaceId);

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

  const [openDivisions, setOpenDivisions] = useState({});

  const toggleDivision = (divId) => {
    setOpenDivisions((prev) => ({ ...prev, [divId]: !prev[divId] }));
  };

  const allDivisionMemberIds = divisions.flatMap((d) =>
    d.members.map((m) => (m.userId?._id || m.userId).toString()),
  );

  const handleCreate = async () => {
    if (!newDivName.trim()) return;
    const name = newDivName.trim();
    const color = newDivColor;
    setNewDivName("");
    setNewDivColor(DIVISION_COLORS[0]);
    setShowCreateForm(false);
    try {
      await createDivision({ name, color });
      toast.success(`Divisi Workspace "${name}" berhasil dibuat. Lanjutkan dengan menambahkan member.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal membuat divisi");
    }
  };

  const handleUpdate = async (divisionId) => {
    if (!editName.trim()) return;
    const name = editName.trim();
    const color = editColor;
    setEditingDiv(null);
    try {
      await updateDivision(divisionId, { name, color });
      toast.success("Divisi berhasil diperbarui");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memperbarui divisi");
    }
  };

  const handleDelete = async (divisionId) => {
    try {
      await deleteDivision(divisionId);
      toast.success("Divisi berhasil dihapus");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus divisi");
    }
  };

  const handleAddMember = async (divisionId, memberId, asLeader = false) => {
    setMemberSearch("");
    setAddAsLeader(false);
    try {
      await addMember(divisionId, memberId, asLeader ? "leader" : "member");
      toast.success(
        asLeader ? "Ketua divisi berhasil ditambahkan" : "Anggota berhasil ditambahkan",
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menambahkan anggota");
    }
  };

  const handleRemoveMember = async (divisionId, userId) => {
    try {
      await removeMember(divisionId, userId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus anggota");
    }
  };

  const handleToggleRole = async (divisionId, userId, currentRole) => {
    const newRole = currentRole === "leader" ? "member" : "leader";
    try {
      await updateMemberRole(divisionId, userId, newRole);
      toast.success(
        newRole === "leader"
          ? "Ketua divisi berhasil di-assign"
          : "Ketua dikembalikan menjadi anggota",
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengubah role");
    }
  };

  const handleMoveMember = async () => {
    if (!movingMember || !moveTargetDiv) return;
    const { divisionId, userId } = movingMember;
    const target = moveTargetDiv;
    setMovingMember(null);
    setMoveTargetDiv("");
    try {
      await moveMember(divisionId, userId, target);
      toast.success("Anggota berhasil dipindahkan");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memindahkan anggota");
    }
  };

  const getAvailableMembers = useCallback(
    (divisionId) => {
      const divMemberIds =
        divisions
          .find((d) => d._id === divisionId)
          ?.members.map((m) => (m.userId?._id || m.userId).toString()) || [];

      return members.filter((m) => {
        const userId = typeof m.userId === "object" ? m.userId?._id : m.userId;
        const lookupId = userId?.toString();
        const userName =
          typeof m.userId === "object" ? m.userId?.name : m.name;
        const userEmail =
          typeof m.userId === "object" ? m.userId?.email : m.email;

        return (
          !divMemberIds.includes(lookupId) &&
          (!memberSearch ||
            userName?.toLowerCase().includes(memberSearch.toLowerCase()) ||
            userEmail?.toLowerCase().includes(memberSearch.toLowerCase()))
        );
      });
    },
    [divisions, members, memberSearch],
  );

  const getMemberId = (m) => {
    if (typeof m.userId === "object") return m.userId?._id?.toString();
    return (m.userId || m._id)?.toString();
  };

  const getMemberName = (m) =>
    typeof m.userId === "object" ? m.userId?.name : m.name;

  const uniqueMembers = new Set(allDivisionMemberIds).size;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Divisi Workspace ({divisions.length})
                {uniqueMembers > 0 && (
                  <span className="text-xs font-normal normal-case ml-1">
                    · {uniqueMembers} anggota
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Berbeda dengan Divisi Event — divisi ini milik workspace dan
                diisi dari member workspace.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs shrink-0"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <Plus className="h-4 w-4" />
              Tambah Divisi
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Create form — Nama + Warna */}
          {showCreateForm && (
            <div className="space-y-3 pb-3 border-b">
              <Input
                placeholder="Nama divisi workspace... (mis. BM, Event, Media)"
                value={newDivName}
                onChange={(e) => setNewDivName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setShowCreateForm(false);
                }}
                className="h-8 text-sm"
                maxLength={100}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Warna:</span>
                <div className="flex gap-1">
                  {DIVISION_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewDivColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full transition-all border-2 flex items-center justify-center",
                        newDivColor === c
                          ? "border-foreground scale-110"
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
                  Buat Divisi
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

          {/* Division list */}
          {divisions.length > 0 ? (
            <div className="space-y-2">
              {divisions.map((div) => {
                const isOpen = openDivisions[div._id] !== false;
                const isEditing = editingDiv === div._id;
                const leaders = div.members.filter((m) => m.role === "leader");

                return (
                  <Collapsible
                    key={div._id}
                    open={isOpen}
                    onOpenChange={() => toggleDivision(div._id)}
                  >
                    <div className="rounded-lg border">
                      {/* Division header */}
                      <div className="flex items-center gap-2 p-2.5">
                        <CollapsibleTrigger asChild>
                          <button className="p-1 hover:bg-accent rounded transition-colors">
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </CollapsibleTrigger>

                        {div.color && (
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: div.color }}
                          />
                        )}

                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2 flex-wrap">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleUpdate(div._id);
                                if (e.key === "Escape") setEditingDiv(null);
                              }}
                              className="h-8 text-sm flex-1 min-w-[140px]"
                              maxLength={100}
                              autoFocus
                            />
                            <div className="flex gap-1">
                              {DIVISION_COLORS.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => setEditColor(c)}
                                  className={cn(
                                    "h-5 w-5 rounded-full transition-all border",
                                    editColor === c
                                      ? "border-foreground scale-110"
                                      : "border-transparent",
                                  )}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleUpdate(div._id)}
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
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate block">
                                {div.name}
                              </span>
                              {leaders.length > 0 && (
                                <span className="text-[11px] text-muted-foreground truncate block">
                                  Ketua:{" "}
                                  {leaders
                                    .map(
                                      (l) =>
                                        l.userId?.name || "Unknown",
                                    )
                                    .join(", ")}
                                </span>
                              )}
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-5 px-1.5"
                            >
                              {div.members.length}
                            </Badge>
                          </>
                        )}

                        {!isEditing && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setAddMemberDivId(div._id);
                                  setMemberSearch("");
                                }}
                                className="gap-2 text-sm"
                              >
                                <UserPlus className="h-4 w-4" />
                                Tambah Anggota
                              </DropdownMenuItem>
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
                                onClick={() => handleDelete(div._id)}
                                className="gap-2 text-sm text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Hapus Divisi
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {/* Division content */}
                      <CollapsibleContent>
                        <Separator />
                        <div className="p-2.5 space-y-1.5">
                          {/* Add member inline */}
                          {addMemberDivId === div._id && (
                            <div className="space-y-1.5 pb-2 border-b mb-2">
                              <Input
                                placeholder="Cari member workspace..."
                                value={memberSearch}
                                onChange={(e) =>
                                  setMemberSearch(e.target.value)
                                }
                                className="h-8 text-sm"
                                autoFocus
                              />
                              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={addAsLeader}
                                  onChange={(e) =>
                                    setAddAsLeader(e.target.checked)
                                  }
                                  className="h-3.5 w-3.5 accent-amber-500"
                                />
                                Tambahkan sebagai ketua divisi
                              </label>
                              <div className="max-h-32 overflow-y-auto space-y-0.5">
                                {getAvailableMembers(div._id).length > 0 ? (
                                  getAvailableMembers(div._id)
                                    .slice(0, 8)
                                    .map((m) => {
                                      const uid = getMemberId(m);
                                      const uname = getMemberName(m);
                                      if (!uid) return null;
                                      return (
                                        <button
                                          key={uid}
                                          onClick={() =>
                                            handleAddMember(
                                              div._id,
                                              uid,
                                              addAsLeader,
                                            )
                                          }
                                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-left hover:bg-accent transition-colors"
                                        >
                                          <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                              {uname?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm truncate flex-1">
                                            {uname}
                                          </span>
                                          {addAsLeader && (
                                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                                          )}
                                          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                      );
                                    })
                                ) : (
                                  <p className="text-[10px] text-muted-foreground text-center py-1">
                                    {memberSearch
                                      ? "Tidak ditemukan"
                                      : "Semua member sudah ditambahkan"}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs w-full"
                                onClick={() => setAddMemberDivId(null)}
                              >
                                Tutup
                              </Button>
                            </div>
                          )}

                          {/* Member list */}
                          {div.members.length > 0 ? (
                            div.members.map((m) => {
                              const user = m.userId;
                              const uid = user?._id || user;
                              const name = user?.name || "Unknown";
                              const email = user?.email || "";

                              return (
                                <div
                                  key={uid}
                                  className="flex items-center gap-2 px-1.5 py-1.5 rounded hover:bg-accent/50 group transition-colors"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                                      {name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-medium truncate">
                                        {name}
                                      </p>
                                      {m.role === "leader" && (
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Ketua Divisi
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                    {email && (
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {email}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() =>
                                            handleToggleRole(
                                              div._id,
                                              uid,
                                              m.role,
                                            )
                                          }
                                          className="p-1.5 rounded hover:bg-accent transition-colors"
                                        >
                                          <Crown
                                            className={cn(
                                              "h-3.5 w-3.5",
                                              m.role === "leader"
                                                ? "text-amber-500"
                                                : "text-muted-foreground",
                                            )}
                                          />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {m.role === "leader"
                                          ? "Jadikan Anggota"
                                          : "Assign sebagai Ketua"}
                                      </TooltipContent>
                                    </Tooltip>

                                    {divisions.length > 1 && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() =>
                                              setMovingMember({
                                                divisionId: div._id,
                                                userId: uid,
                                                name,
                                                divisionName: div.name,
                                              })
                                            }
                                            className="p-1.5 rounded hover:bg-accent transition-colors"
                                          >
                                            <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Pindah Divisi
                                        </TooltipContent>
                                      </Tooltip>
                                    )}

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() =>
                                            handleRemoveMember(div._id, uid)
                                          }
                                          className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                                        >
                                          <UserMinus className="h-3.5 w-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Hapus dari divisi
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex flex-col items-center py-3 gap-1.5">
                              <p className="text-xs text-muted-foreground">
                                Belum ada anggota — tambahkan member workspace
                                ke divisi ini
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs gap-1.5"
                                onClick={() => {
                                  setAddMemberDivId(div._id);
                                  setMemberSearch("");
                                }}
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                Tambah Anggota
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <Users className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Belum ada Divisi Workspace. Buat divisi (Nama + Warna), lalu
                tambahkan member dan assign ketuanya.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-4 w-4" />
                Buat Divisi Pertama
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Move member dialog */}
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
            <DialogTitle className="text-base">Pindah Anggota</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Pindahkan <strong>{movingMember?.name}</strong> dari{" "}
              <strong>{movingMember?.divisionName}</strong> ke:
            </p>
            <Select value={moveTargetDiv} onValueChange={setMoveTargetDiv}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Pilih divisi tujuan..." />
              </SelectTrigger>
              <SelectContent>
                {divisions
                  .filter((d) => d._id !== movingMember?.divisionId)
                  .map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      <span className="flex items-center gap-2">
                        {d.color && (
                          <span
                            className="h-2 w-2 rounded-full inline-block"
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
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMovingMember(null)}
            >
              Batal
            </Button>
            <Button
              onClick={handleMoveMember}
              disabled={!moveTargetDiv}
            >
              Pindahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
