const mongoose = require("mongoose");

// ── Workspace Division ─────────────────────────────────
// Divisi tingkat Workspace — BERBEDA dari EventDivision (divisi per-event).
// Input utama: Nama + Warna. Member diambil dari WorkspaceMember,
// dengan satu/beberapa "ketua" (role: leader).
const workspaceDivisionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Nama divisi harus diisi"],
      trim: true,
      maxlength: [100, "Nama divisi maksimal 100 karakter"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [500, "Deskripsi divisi maksimal 500 karakter"],
    },
    color: {
      type: String,
      default: null,
      match: [
        /^#([0-9A-Fa-f]{6})$/,
        "Format warna harus hex (contoh: #FF5733)",
      ],
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: {
            values: ["leader", "member"],
            message: "Role harus salah satu dari: leader, member",
          },
          default: "member",
        },
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────
workspaceDivisionSchema.index({ workspaceId: 1, isDeleted: 1 });
workspaceDivisionSchema.index({ "members.userId": 1 });

// ── Pre-find: exclude soft-deleted ──────────────────
workspaceDivisionSchema.pre(/^find/, function (next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model("WorkspaceDivision", workspaceDivisionSchema);
