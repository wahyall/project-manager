const mongoose = require("mongoose");

// ── Idea (Bank Ide) ──────────────────────────────────
const ideaSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Judul ide harus diisi"],
      trim: true,
      maxlength: [120, "Judul ide maksimal 120 karakter"],
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["baru", "dipertimbangkan", "direalisasi", "diarsipkan"],
        message:
          "Status harus salah satu dari: baru, dipertimbangkan, direalisasi, diarsipkan",
      },
      default: "baru",
    },
    // Penampung status sebelum naik otomatis ke "direalisasi".
    // Dipakai untuk mengembalikan status saat tautan Event terakhir dilepas.
    statusBeforeRealized: {
      type: String,
      enum: {
        values: ["baru", "dipertimbangkan", "diarsipkan", null],
        message: "Status sebelumnya tidak valid",
      },
      default: null,
    },
    labels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkspaceLabel",
      },
    ],
    votes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
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
ideaSchema.index({ workspaceId: 1, isDeleted: 1 });
ideaSchema.index({ workspaceId: 1, status: 1 });
ideaSchema.index({ labels: 1 });
ideaSchema.index({ createdBy: 1 });

// ── Pre-find: exclude soft-deleted ──────────────────
ideaSchema.pre(/^find/, function (next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model("Idea", ideaSchema);
