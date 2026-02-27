"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  Camera,
  KeyRound,
  Bell,
  Clock,
  Save,
  Loader2,
  Check,
  X,
  Phone,
  Shield,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Notification type labels ────────────────────────
const NOTIFICATION_TYPES = [
  {
    key: "mention",
    label: "Mention (@)",
    description: "Saat seseorang menyebutmu di komentar atau deskripsi",
  },
  {
    key: "assignTask",
    label: "Assign Task",
    description: "Saat kamu ditugaskan ke sebuah task",
  },
  {
    key: "dueDate",
    label: "Due Date Dekat",
    description: "Pengingat saat deadline task mendekat",
  },
  {
    key: "newComment",
    label: "Komentar Baru",
    description: "Saat ada komentar baru di task yang kamu ikuti",
  },
  {
    key: "newMember",
    label: "Member Baru",
    description: "Saat ada anggota baru bergabung ke workspace",
  },
  {
    key: "eventStart",
    label: "Event Dimulai",
    description: "Saat event yang kamu ikuti akan dimulai",
  },
  {
    key: "taskUpdate",
    label: "Update Task",
    description: "Saat ada perubahan pada task milikmu",
  },
];

const DUE_DATE_OPTIONS = [
  { value: "H", label: "Hari-H", description: "Di hari deadline" },
  { value: "H-1", label: "H-1", description: "1 hari sebelum" },
  { value: "H-3", label: "H-3", description: "3 hari sebelum" },
];

// ═══════════════════════════════════════════════════════
// SECTION: Profile Information
// ═══════════════════════════════════════════════════════
function ProfileSection() {
  const { user, updateProfile, updateAvatar } = useAuth();
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setWhatsappNumber(user.whatsappNumber || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        whatsappNumber: whatsappNumber.trim() || null,
      });
      toast.success("Profil berhasil diperbarui");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal memperbarui profil",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.error("Hanya file JPG atau PNG yang diizinkan");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 1MB");
      return;
    }

    setAvatarUploading(true);
    try {
      // Use Puter.js for upload if available, otherwise use base64 as fallback
      if (typeof window !== "undefined" && window.puter) {
        const uploaded = await window.puter.fs.write(
          `avatars/${user._id}_${Date.now()}.${file.type.split("/")[1]}`,
          file,
          { createMissingParents: true },
        );
        const url = await uploaded.toURL?.() || uploaded.path;
        await updateAvatar(url);
      } else {
        // Fallback: convert to base64 data URL
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            await updateAvatar(event.target.result);
            toast.success("Avatar berhasil diperbarui");
          } catch (err) {
            toast.error("Gagal memperbarui avatar");
          }
          setAvatarUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      }
      toast.success("Avatar berhasil diperbarui");
    } catch (error) {
      toast.error("Gagal mengupload avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    try {
      await updateAvatar(null);
      toast.success("Avatar berhasil dihapus");
    } catch (error) {
      toast.error("Gagal menghapus avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  const hasChanges =
    name.trim() !== (user?.name || "") ||
    (whatsappNumber.trim() || "") !== (user?.whatsappNumber || "");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle>Informasi Profil</CardTitle>
            <CardDescription>
              Kelola informasi profil yang terlihat oleh anggota tim
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-primary/5 text-primary font-bold text-2xl ring-2 ring-border overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                user?.name?.charAt(0).toUpperCase() || "U"
              )}
            </div>
            {avatarUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={avatarUploading}
                onClick={() =>
                  document.getElementById("avatar-upload").click()
                }
              >
                <Camera className="h-3.5 w-3.5" />
                {user?.avatar ? "Ganti Foto" : "Upload Foto"}
              </Button>
              {user?.avatar && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-destructive"
                  disabled={avatarUploading}
                  onClick={handleRemoveAvatar}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG atau PNG, maksimal 1MB
            </p>
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
        </div>

        <Separator />

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Nama Lengkap <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masukkan nama lengkap"
            maxLength={100}
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground">
            {name.length}/100 karakter
          </p>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">
            Email
          </Label>
          <Input
            value={user?.email || ""}
            readOnly
            disabled
            className="max-w-md bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Email tidak dapat diubah
          </p>
        </div>

        {/* WhatsApp */}
        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="text-sm font-medium flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" />
            Nomor WhatsApp
          </Label>
          <Input
            id="whatsapp"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+6281234567890"
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground">
            Format internasional (contoh: +6281234567890). Digunakan untuk
            notifikasi WhatsApp.
          </p>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSaveProfile}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Perubahan
          </Button>
          {hasChanges && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Ada perubahan belum disimpan
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION: Change Password
// ═══════════════════════════════════════════════════════
function PasswordSection() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordsMatch =
    newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordLongEnough = newPassword.length >= 8;
  const canSubmit =
    currentPassword && newPassword && confirmPassword && passwordsMatch && passwordLongEnough;

  const handleChangePassword = async () => {
    if (!canSubmit) return;

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      toast.success("Password berhasil diubah");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal mengubah password",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle>Ubah Password</CardTitle>
            <CardDescription>
              Pastikan password baru kuat dan mudah diingat
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current password */}
        <div className="space-y-2">
          <Label htmlFor="current-pw" className="text-sm font-medium">
            Password Saat Ini
          </Label>
          <div className="relative max-w-md">
            <Input
              id="current-pw"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Masukkan password saat ini"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showCurrent ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Separator className="my-1" />

        {/* New password */}
        <div className="space-y-2">
          <Label htmlFor="new-pw" className="text-sm font-medium">
            Password Baru
          </Label>
          <div className="relative max-w-md">
            <Input
              id="new-pw"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showNew ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {newPassword && !passwordLongEnough && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <X className="h-3 w-3" />
              Password minimal 8 karakter
            </p>
          )}
          {newPassword && passwordLongEnough && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Panjang password cukup
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-2">
          <Label htmlFor="confirm-pw" className="text-sm font-medium">
            Konfirmasi Password Baru
          </Label>
          <div className="relative max-w-md">
            <Input
              id="confirm-pw"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <X className="h-3 w-3" />
              Password tidak cocok
            </p>
          )}
          {confirmPassword && passwordsMatch && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Password cocok
            </p>
          )}
        </div>

        <div className="pt-2">
          <Button
            onClick={handleChangePassword}
            disabled={saving || !canSubmit}
            variant="outline"
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Ubah Password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION: Notification Preferences
// ═══════════════════════════════════════════════════════
function NotificationSection() {
  const { user, updateNotifications } = useAuth();
  const [prefs, setPrefs] = useState({});
  const [reminders, setReminders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      setPrefs(user.notificationPreferences || {});
      setReminders(user.dueDateReminders || ["H-1"]);
      setHasChanges(false);
    }
  }, [user]);

  const togglePref = (type, channel) => {
    setPrefs((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: !prev[type]?.[channel],
      },
    }));
    setHasChanges(true);
  };

  const toggleReminder = (value) => {
    setReminders((prev) => {
      const next = prev.includes(value)
        ? prev.filter((r) => r !== value)
        : [...prev, value];
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotifications(prefs, reminders);
      toast.success("Preferensi notifikasi berhasil diperbarui");
      setHasChanges(false);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Gagal memperbarui preferensi notifikasi",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <Bell className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle>Preferensi Notifikasi</CardTitle>
            <CardDescription>
              Atur jenis notifikasi yang ingin kamu terima
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification toggle table */}
        <div className="rounded-lg border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_100px_100px] bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Tipe Notifikasi</span>
            <span className="text-center">In-App</span>
            <span className="text-center">WhatsApp</span>
          </div>

          {/* Rows */}
          {NOTIFICATION_TYPES.map((type, index) => (
            <div
              key={type.key}
              className={`grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_100px_100px] items-center px-4 py-3 ${
                index < NOTIFICATION_TYPES.length - 1
                  ? "border-b border-border/50"
                  : ""
              } hover:bg-muted/30 transition-colors`}
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {type.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                  {type.description}
                </p>
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={prefs[type.key]?.inApp ?? true}
                  onCheckedChange={() => togglePref(type.key, "inApp")}
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={prefs[type.key]?.whatsapp ?? false}
                  onCheckedChange={() => togglePref(type.key, "whatsapp")}
                />
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Due date reminders */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">
              Pengingat Due Date
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Pilih kapan kamu ingin diingatkan tentang deadline task
          </p>
          <div className="flex flex-wrap gap-2">
            {DUE_DATE_OPTIONS.map((option) => {
              const isSelected = reminders.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleReminder(option.value)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="text-left">
                    <span>{option.label}</span>
                    <span className="hidden sm:inline text-xs opacity-70 ml-1.5">
                      — {option.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Preferensi
          </Button>
          {hasChanges && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Ada perubahan belum disimpan
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════
export default function AccountSettingsPage() {
  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Pengaturan Akun
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola profil, keamanan, dan preferensi notifikasi akunmu
        </p>
      </div>

      {/* Quick nav pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <a
          href="#profil"
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors shrink-0"
        >
          <User className="h-3 w-3" />
          Profil
        </a>
        <a
          href="#password"
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors shrink-0"
        >
          <KeyRound className="h-3 w-3" />
          Password
        </a>
        <a
          href="#notifikasi"
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors shrink-0"
        >
          <Bell className="h-3 w-3" />
          Notifikasi
        </a>
      </div>

      {/* Sections */}
      <div id="profil">
        <ProfileSection />
      </div>

      <div id="password">
        <PasswordSection />
      </div>

      <div id="notifikasi">
        <NotificationSection />
      </div>
    </div>
  );
}

