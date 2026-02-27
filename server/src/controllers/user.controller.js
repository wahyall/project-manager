const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// ──────────────────────────────────────────────
// GET /api/users/me — Profil user saat ini
// ──────────────────────────────────────────────
exports.getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("User tidak ditemukan", 404));
  }

  res.status(200).json({
    status: "success",
    user,
  });
});

// ──────────────────────────────────────────────
// PUT /api/users/me — Update profil (nama, whatsapp)
// ──────────────────────────────────────────────
exports.updateProfile = catchAsync(async (req, res, next) => {
  const { name, whatsappNumber } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("User tidak ditemukan", 404));
  }

  // Validasi nama
  if (name !== undefined) {
    if (!name.trim()) {
      return next(new AppError("Nama tidak boleh kosong", 400));
    }
    if (name.trim().length > 100) {
      return next(new AppError("Nama maksimal 100 karakter", 400));
    }
    user.name = name.trim();
  }

  // Validasi whatsapp
  if (whatsappNumber !== undefined) {
    if (whatsappNumber && whatsappNumber.trim()) {
      // Format: harus diawali + dan hanya angka setelahnya
      const cleaned = whatsappNumber.trim();
      if (!/^\+\d{8,15}$/.test(cleaned)) {
        return next(
          new AppError(
            "Format nomor WhatsApp tidak valid. Gunakan format internasional (contoh: +6281234567890)",
            400,
          ),
        );
      }
      user.whatsappNumber = cleaned;
    } else {
      user.whatsappNumber = null;
    }
  }

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    user,
  });
});

// ──────────────────────────────────────────────
// PUT /api/users/me/password — Ubah password
// ──────────────────────────────────────────────
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(new AppError("Semua field password harus diisi", 400));
  }

  if (newPassword !== confirmPassword) {
    return next(
      new AppError("Password baru dan konfirmasi password tidak cocok", 400),
    );
  }

  if (newPassword.length < 8) {
    return next(new AppError("Password baru minimal 8 karakter", 400));
  }

  // Ambil user dengan password
  const user = await User.findById(req.user.id).select("+password");
  if (!user) {
    return next(new AppError("User tidak ditemukan", 404));
  }

  // Verifikasi password lama
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError("Password lama tidak benar", 401));
  }

  // Update password (akan di-hash oleh pre-save hook)
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password berhasil diubah",
  });
});

// ──────────────────────────────────────────────
// PUT /api/users/me/avatar — Upload/update avatar
// Puter.js uploads client-side, sends URL here
// ──────────────────────────────────────────────
exports.updateAvatar = catchAsync(async (req, res, next) => {
  const { avatar } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("User tidak ditemukan", 404));
  }

  // avatar bisa null (hapus avatar) atau string URL
  if (avatar !== undefined && avatar !== null && typeof avatar !== "string") {
    return next(new AppError("Avatar harus berupa URL string", 400));
  }

  user.avatar = avatar || null;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    user,
  });
});

// ──────────────────────────────────────────────
// PUT /api/users/me/notifications — Update preferensi notifikasi
// ──────────────────────────────────────────────
exports.updateNotifications = catchAsync(async (req, res, next) => {
  const { notificationPreferences, dueDateReminders } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("User tidak ditemukan", 404));
  }

  // Update notification preferences
  if (notificationPreferences) {
    const validTypes = [
      "mention",
      "assignTask",
      "dueDate",
      "newComment",
      "newMember",
      "eventStart",
      "taskUpdate",
    ];

    for (const type of validTypes) {
      if (notificationPreferences[type]) {
        if (typeof notificationPreferences[type].inApp === "boolean") {
          user.notificationPreferences[type].inApp =
            notificationPreferences[type].inApp;
        }
        if (typeof notificationPreferences[type].whatsapp === "boolean") {
          user.notificationPreferences[type].whatsapp =
            notificationPreferences[type].whatsapp;
        }
      }
    }
  }

  // Update due date reminders
  if (dueDateReminders !== undefined) {
    if (!Array.isArray(dueDateReminders)) {
      return next(
        new AppError("dueDateReminders harus berupa array", 400),
      );
    }

    const validReminders = ["H", "H-1", "H-3"];
    const filtered = dueDateReminders.filter((r) =>
      validReminders.includes(r),
    );
    user.dueDateReminders = filtered;
  }

  user.markModified("notificationPreferences");
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    user,
  });
});

