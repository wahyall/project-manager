"use client";

import { useEffect, useState, useCallback } from "react";
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
  DialogTrigger,
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
} from "lucide-react";
import { toast } from "sonner";

const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    icon: Crown,
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  member: {
    label: "Member",
    icon: Shield,
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  guest: {
    label: "Guest",
    icon: Shield,
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

function MemberRow({ member, workspace, currentUserId, isAdminOrOwner, onAction }) {
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
    <div className="flex items-center gap-3 py-3 px-1 group">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={member.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            member.name?.charAt(0).toUpperCase() || "?"
          )}
        </div>
        {/* Online indicator could go here */}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground truncate">
            {member.name}
          </span>
          {isCurrentUser && (
            <span className="text-xs text-muted-foreground">(Kamu)</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground truncate block">
          {member.email}
        </span>
      </div>

      {/* Role badge */}
      <Badge
        variant="secondary"
        className={`text-xs font-medium shrink-0 gap-1 ${roleConfig.color}`}
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
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canManage && (
              <>
                <DropdownMenuItem
                  onClick={() => onAction("changeRole", member, "admin")}
                  disabled={member.role === "admin"}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Jadikan Admin
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction("changeRole", member, "member")}
                  disabled={member.role === "member"}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Jadikan Member
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction("changeRole", member, "guest")}
                  disabled={member.role === "guest"}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Jadikan Guest
                </DropdownMenuItem>
                {workspace.role === "owner" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onAction("transfer", member)}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transfer Ownership
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onAction("remove", member)}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Keluarkan
                </DropdownMenuItem>
              </>
            )}
            {isCurrentUser && !isOwner && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Undang Member
          </DialogTitle>
          <DialogDescription>
            Undang anggota baru ke workspace "{workspace.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Invite via Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Tautan Undangan
            </Label>
            <p className="text-xs text-muted-foreground">
              Bagikan tautan ini agar orang lain bisa langsung bergabung
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="text-xs font-mono bg-muted"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
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
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Generate tautan baru (tautan lama tidak berlaku)
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
              atau
            </span>
          </div>

          {/* Invite via Email */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Undang via Email
            </Label>
            <Textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com&#10;atau pisahkan dengan baris baru..."
              rows={3}
              className="resize-none text-sm"
            />

            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Role
                </Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Pesan (opsional)
              </Label>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Yuk gabung ke workspace kita!"
                maxLength={500}
                className="h-9"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Tutup
          </Button>
          <Button
            onClick={handleSendInvites}
            disabled={sending || !emails.trim()}
            className="gap-2"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
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
          description: `Yakin ingin mengeluarkan ${member.name} dari workspace ini? Task yang di-assign ke mereka akan tetap ada.`,
        });
      } else if (action === "transfer") {
        setConfirmAction({
          type: "transfer",
          member,
          title: "Transfer Ownership",
          description: `Yakin ingin mentransfer ownership ke ${member.name}? Kamu akan menjadi Admin setelah transfer.`,
        });
      } else if (action === "leave") {
        setConfirmAction({
          type: "leave",
          title: "Keluar dari Workspace",
          description: `Yakin ingin keluar dari workspace "${workspace.name}"?`,
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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Anggota Workspace</CardTitle>
              <CardDescription>
                {members.length} member di workspace ini
              </CardDescription>
            </div>
            {isAdminOrOwner && (
              <Button
                className="gap-2 shrink-0"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Undang Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau email..."
              className="pl-9 h-9"
            />
          </div>

          {/* Members list */}
          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery
                ? "Tidak ada member yang cocok"
                : "Belum ada member"}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredMembers.map((member) => (
                <MemberRow
                  key={member._id}
                  member={member}
                  workspace={workspace}
                  currentUserId={user?._id}
                  isAdminOrOwner={isAdminOrOwner}
                  onAction={handleAction}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
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
            >
              {actionLoading && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {confirmAction?.type === "remove"
                ? "Keluarkan"
                : confirmAction?.type === "leave"
                  ? "Keluar"
                  : confirmAction?.type === "transfer"
                    ? "Transfer"
                    : "Ubah"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

