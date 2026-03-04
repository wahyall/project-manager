const mongoose = require("mongoose");

// ── Brainstorming Board ─────────────────────────────
const brainstormingBoardSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Nama board harus diisi"],
      trim: true,
      maxlength: [100, "Nama board maksimal 100 karakter"],
    },
    thumbnail: {
      type: String,
      default: null,
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
brainstormingBoardSchema.index({ workspaceId: 1, isDeleted: 1 });
brainstormingBoardSchema.index({ createdBy: 1 });

// ── Pre-find: exclude soft-deleted ──────────────────
brainstormingBoardSchema.pre(/^find/, function (next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model("BrainstormingBoard", brainstormingBoardSchema);
