"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  UserPlus,
  Link2,
  Copy,
  RefreshCw,
  MoreVertical,
  Shield,
  ShieldCheck,
  Crown,
  UserMinus,
  ArrowRightLeft,
  Loader2,
  Mail,
  Search,
  LogOut,
  Check,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarWithStatus } from "@/components/online-indicator";
import { usePresence } from "@/hooks/use-presence";

const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    icon: Crown,
    color:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    color:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  member: {
    label: "Member",
    icon: Shield,
    color:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  guest: {
    label: "Guest",
    icon: Shield,
    color:
      "bg-muted text-muted-foreground border-border/60",
  },
};

function MemberRow({ member, workspace, currentUserId, isAdminOrOwner, onAction, isOnline }) {
  const isCurrentUser = member.userId === currentUserId;
  const isOwner = member.role === "owner";
  const canManage =
    isAdminOrOwner &&
    !isCurrentUser &&
    !isOwner &&
    (workspace.role === "owner" || member.role !== "admin");

  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
  const RoleIcon = roleConfig.icon;

  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted/40 transition-colors group">
      {/* Avatar with online indicator */}
      <a
        href={`/workspace/${workspace._id}/members/${member.userId}`}
        className="shrink-0"
      >
        <AvatarWithStatus
          src={member.avatar}
          name={member.name}
          isOnline={isOnline}
          size="md"
          className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all rounded-full"
        />
      </a>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={`/workspace/${workspace._id}/members/${member.userId}`}
            className="font-medium text-sm text-foreground truncate hover:text-primary transition-colors"
          >
            {member.name}
          </a>
          {isCurrentUser && (
            <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              Kamu
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground truncate block">
          {member.email}
        </span>
      </div>

      {/* Role badge */}
      <Badge
        variant="outline"
        className={`text-2xs font-medium shrink-0 gap-1 rounded-full px-2.5 py-0.5 border ${roleConfig.color}`}
      >
        <RoleIcon className="h-3 w-3" />
        {roleConfig.label}
      </Badge>

      {/* Actions */}
      {(canManage || (!isOwner && isCurrentUser)) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-8 w-8 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
            {canManage && (
              <>
                <DropdownMenuItem
                  onClick={() => onAction("changeRole", member, "admin")}
                  disabled={member.role === "admin"}
                  className="rounded-lg text-xs"
                >
                  <ShieldCheck className="h-4 w-4 mr-2 text-blue-500" />
                  Jadikan Admin
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction("changeRole", member, "member")}
                  disabled={member.role === "member"}
                  className="rounded-lg text-xs"
                >
                  <Shield className="h-4 w-4 mr-2 text-emerald-500" />
                  Jadikan Member
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction("changeRole", member, "guest")}
                  disabled={member.role === "guest"}
                  className="rounded-lg text-xs"
                >
                  <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                  Jadikan Guest
                </DropdownMenuItem>
                {workspace.role === "owner" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onAction("transfer", member)}
                      className="rounded-lg text-xs text-amber-600 dark:text-amber-400"
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transfer Ownership
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-lg text-xs text-destructive focus:text-destructive"
                  onClick={() => onAction("remove", member)}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Keluarkan
                </DropdownMenuItem>
              </>
            )}
            {isCurrentUser && !isOwner && (
              <DropdownMenuItem
                className="rounded-lg text-xs text-destructive focus:text-destructive"
                onClick={() => onAction("leave")}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Keluar dari Workspace
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function InviteDialog({ workspace, open, onOpenChange }) {
  const { inviteMembers, regenerateInviteLink } = useWorkspace();
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("member");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState(
    `${typeof window !== "undefined" ? window.location.origin : ""}/workspaces/join/${workspace.inviteCode}`,
  );
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleSendInvites = async () => {
    if (!emails.trim()) {
      toast.error("Masukkan minimal 1 email");
      return;
    }

    setSending(true);
    try {
      const result = await inviteMembers(workspace._id, {
        emails: emails.trim(),
        role,
        message: message.trim() || undefined,
      });

      if (result.sent.length > 0) {
        toast.success(`${result.sent.length} undangan berhasil dikirim`);
      }
      if (result.errors.length > 0) {
        result.errors.forEach((err) =>
          toast.error(`${err.email}: ${err.reason}`),
        );
      }

      setEmails("");
      setMessage("");
      if (result.errors.length === 0) {
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal mengirim undangan",
      );
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Tautan undangan disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin tautan");
    }
  };

  const handleRegenerateLink = async () => {
    setRegenerating(true);
    try {
      const result = await regenerateInviteLink(workspace._id);
      setInviteLink(
        `${window.location.origin}/workspaces/join/${result.inviteCode}`,
      );
      toast.success("Tautan undangan berhasil diperbarui");
    } catch (error) {
      toast.error("Gagal memperbarui tautan");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Undang Anggota Baru
              </DialogTitle>
              <DialogDescription className="text-xs">
                Ajak tim kamu bergabung ke workspace "{workspace.name}"
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Invite via Link */}
          <div className="space-y-2 p-3.5 rounded-xl bg-muted/40 border border-border/80">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              Tautan Undangan Cepat
            </Label>
            <p className="text-2xs text-muted-foreground">
              Siapapun yang memiliki link ini dapat langsung bergabung ke workspace
            </p>
            <div className="flex gap-2 pt-1">
              <Input
                value={inviteLink}
                readOnly
                className="text-xs font-mono bg-background/80 h-9 rounded-lg"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="h-9 w-9 shrink-0 rounded-lg"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Salin tautan</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRegenerateLink}
                    disabled={regenerating}
                    className="h-9 w-9 shrink-0 rounded-lg"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Generate tautan baru (batalkan tautan lama)
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-2xs uppercase tracking-wider text-muted-foreground font-semibold">
              atau via email
            </span>
          </div>

          {/* Invite via Email */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Alamat Email
              </Label>
              <Textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="rekan1@organisasi.id, rekan2@organisasi.id&#10;atau pisahkan dengan enter..."
                rows={3}
                className="resize-none text-xs rounded-xl bg-background/50 border-border/80"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Peran Default</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="admin">Admin (Kelola semua fitur)</SelectItem>
                    <SelectItem value="member">Member (Kontributor standar)</SelectItem>
                    <SelectItem value="guest">Guest (Akses terbatas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pesan Tambahan (Opsional)</Label>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Yuk gabung ke proyek ini!"
                  maxLength={500}
                  className="h-9 rounded-xl text-xs bg-background/50"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Tutup
          </Button>
          <Button
            onClick={handleSendInvites}
            disabled={sending || !emails.trim()}
            className="gap-2 rounded-xl text-xs shadow-xs"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Kirim Undangan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MembersTab({ workspace, isAdminOrOwner }) {
  const { user } = useAuth();
  const {
    members,
    membersLoading,
    fetchMembers,
    changeMemberRole,
    removeMember,
    leaveWorkspace,
    transferOwnership,
  } = useWorkspace();
  const router = useRouter();
  const { isUserOnline } = usePresence(workspace._id);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchMembers(workspace._id);
  }, [workspace._id, fetchMembers]);

  const filteredMembers = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAction = useCallback(
    (action, member, extra) => {
      if (action === "changeRole") {
        setConfirmAction({
          type: "changeRole",
          member,
          role: extra,
          title: `Ubah Role`,
          description: `Ubah role ${member.name} menjadi ${ROLE_CONFIG[extra]?.label}?`,
        });
      } else if (action === "remove") {
        setConfirmAction({
          type: "remove",
          member,
          title: "Keluarkan Member",
          description: `Yakin ingin mengeluarkan ${member.name} dari workspace ini? Seluruh task yang di-assign akan tetap dipertahankan.`,
        });
      } else if (action === "transfer") {
        setConfirmAction({
          type: "transfer",
          member,
          title: "Transfer Kepemilikan Workspace",
          description: `Yakin ingin mentransfer ownership kepada ${member.name}? Peran kamu akan otomatis disesuaikan menjadi Admin.`,
        });
      } else if (action === "leave") {
        setConfirmAction({
          type: "leave",
          title: "Keluar dari Workspace",
          description: `Yakin ingin keluar dari workspace "${workspace.name}"? Kamu memerlukan undangan baru untuk bergabung kembali.`,
        });
      }
    },
    [workspace.name],
  );

  const executeAction = async () => {
    if (!confirmAction) return;

    setActionLoading(true);
    try {
      switch (confirmAction.type) {
        case "changeRole":
          await changeMemberRole(
            workspace._id,
            confirmAction.member.userId,
            confirmAction.role,
          );
          toast.success(
            `Role ${confirmAction.member.name} berhasil diubah menjadi ${ROLE_CONFIG[confirmAction.role]?.label}`,
          );
          break;
        case "remove":
          await removeMember(
            workspace._id,
            confirmAction.member.userId,
          );
          toast.success(
            `${confirmAction.member.name} berhasil dikeluarkan`,
          );
          break;
        case "transfer":
          await transferOwnership(
            workspace._id,
            confirmAction.member.userId,
          );
          toast.success(
            `Ownership berhasil ditransfer ke ${confirmAction.member.name}`,
          );
          break;
        case "leave":
          await leaveWorkspace(workspace._id);
          toast.success("Berhasil keluar dari workspace");
          router.push("/workspaces");
          break;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal melakukan aksi");
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Daftar Anggota Tim
                </CardTitle>
                <CardDescription className="text-xs">
                  {members.length} anggota terdaftar dalam workspace ini
                </CardDescription>
              </div>
            </div>
            {isAdminOrOwner && (
              <Button
                className="gap-2 shrink-0 rounded-xl h-9 text-xs shadow-xs"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Undang Anggota
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari anggota berdasarkan nama atau email..."
              className="pl-9 h-10 rounded-xl bg-background/50 border-border/80 text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Members list */}
          {membersLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Memuat daftar anggota...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border/80 rounded-xl">
              <p className="font-medium text-foreground">
                {searchQuery ? "Tidak ditemukan anggota yang sesuai" : "Belum ada anggota"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Coba gunakan kata kunci pencarian yang lain." : "Undang tim kamu untuk mulai berkolaborasi."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMembers.map((member) => (
                <MemberRow
                  key={member._id}
                  member={member}
                  workspace={workspace}
                  currentUserId={user?._id}
                  isAdminOrOwner={isAdminOrOwner}
                  onAction={handleAction}
                  isOnline={isUserOnline(member.userId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <InviteDialog
        workspace={workspace}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />

      {/* Confirm Action Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent className="rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              {confirmAction?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              {confirmAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel disabled={actionLoading} className="rounded-xl text-xs">
              Batal
            </AlertDialogCancel>
            <Button
              variant={
                confirmAction?.type === "remove" ||
                confirmAction?.type === "leave"
                  ? "destructive"
                  : "default"
              }
              onClick={executeAction}
              disabled={actionLoading}
              className="rounded-xl text-xs gap-1.5"
            >
              {actionLoading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {confirmAction?.type === "remove"
                ? "Keluarkan"
                : confirmAction?.type === "leave"
                  ? "Keluar"
                  : confirmAction?.type === "transfer"
                    ? "Transfer Kepemilikan"
                    : "Simpan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
