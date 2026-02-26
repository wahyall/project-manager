const mongoose = require("mongoose");
const crypto = require("crypto");

const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  usedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL: hapus token expired otomatis setelah 24 jam
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
passwordResetTokenSchema.index({ userId: 1 });

// Static: buat token baru
passwordResetTokenSchema.statics.createToken = async function (userId) {
  // Hapus token lama yang belum dipakai
  await this.deleteMany({ userId, usedAt: null });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const tokenDoc = await this.create({
    userId,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 jam
  });

  // Return raw token (untuk dikirim via email), bukan hashed
  return { rawToken, tokenDoc };
};

// Static: verifikasi token
passwordResetTokenSchema.statics.verifyToken = async function (rawToken) {
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const tokenDoc = await this.findOne({
    token: hashedToken,
    expiresAt: { $gt: new Date() },
    usedAt: null,
  });

  return tokenDoc;
};

module.exports = mongoose.model("PasswordResetToken", passwordResetTokenSchema);
