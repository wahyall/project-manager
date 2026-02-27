const mongoose = require("mongoose");
const crypto = require("crypto");

const workspaceInvitationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    email: {
      type: String,
      required: [true, "Email harus diisi"],
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "member", "guest"],
      default: "member",
    },
    message: {
      type: String,
      maxlength: [500, "Pesan undangan maksimal 500 karakter"],
      default: null,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    token: {
      type: String,
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
workspaceInvitationSchema.index({ workspaceId: 1, email: 1 });
workspaceInvitationSchema.index({ token: 1 }, { unique: true });
workspaceInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

// Static: buat invitation
workspaceInvitationSchema.statics.createInvitation = async function ({
  workspaceId,
  email,
  role,
  message,
  invitedBy,
}) {
  // Hapus undangan pending sebelumnya untuk email + workspace yang sama
  await this.deleteMany({ workspaceId, email, status: "pending" });

  const token = crypto.randomBytes(32).toString("hex");

  return this.create({
    workspaceId,
    email,
    role: role || "member",
    message,
    invitedBy,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 hari
  });
};

module.exports = mongoose.model("WorkspaceInvitation", workspaceInvitationSchema);

