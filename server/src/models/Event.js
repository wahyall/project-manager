const mongoose = require("mongoose");

// ── Event ────────────────────────────────────────────
const eventSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Judul event harus diisi"],
      trim: true,
      maxlength: [100, "Judul event maksimal 100 karakter"],
    },
    description: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      required: [true, "Tanggal mulai harus diisi"],
    },
    endDate: {
      type: Date,
      required: [true, "Tanggal selesai harus diisi"],
    },
    color: {
      type: String,
      default: "#8B5CF6",
      match: [
        /^#([0-9A-Fa-f]{6})$/,
        "Format warna harus hex (contoh: #FF5733)",
      ],
    },
    status: {
      type: String,
      enum: {
        values: ["upcoming", "ongoing", "completed"],
        message: "Status harus salah satu dari: upcoming, ongoing, completed",
      },
      default: "upcoming",
    },
    participants: [
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
eventSchema.index({ workspaceId: 1, isDeleted: 1 });
eventSchema.index({ workspaceId: 1, status: 1 });
eventSchema.index({ participants: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ endDate: 1 });

// ── Validation: endDate >= startDate ────────────────
eventSchema.pre("validate", function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate(
      "endDate",
      "Tanggal selesai harus sama atau setelah tanggal mulai",
    );
  }
  next();
});

// ── Pre-find: exclude soft-deleted ──────────────────
eventSchema.pre(/^find/, function (next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model("Event", eventSchema);

