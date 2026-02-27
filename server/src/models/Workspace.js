const mongoose = require("mongoose");
const crypto = require("crypto");

const kanbanColumnSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Nama kolom harus diisi"],
      trim: true,
      maxlength: [50, "Nama kolom maksimal 50 karakter"],
    },
    color: {
      type: String,
      default: "#6B7280",
      match: [/^#([0-9A-Fa-f]{6})$/, "Format warna harus hex (contoh: #FF5733)"],
    },
    order: {
      type: Number,
      required: true,
    },
  },
  { _id: true },
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Nama workspace harus diisi"],
      trim: true,
      maxlength: [50, "Nama workspace maksimal 50 karakter"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Deskripsi maksimal 500 karakter"],
      default: "",
    },
    logo: {
      type: String,
      default: null,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    inviteCode: {
      type: String,
    },
    kanbanColumns: {
      type: [kanbanColumnSchema],
      default: () => [
        { name: "To Do", color: "#6B7280", order: 0 },
        { name: "In Progress", color: "#3B82F6", order: 1 },
        { name: "Review", color: "#F59E0B", order: 2 },
        { name: "Done", color: "#10B981", order: 3 },
      ],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
workspaceSchema.index({ ownerId: 1 });
workspaceSchema.index({ inviteCode: 1 }, { unique: true, sparse: true });
workspaceSchema.index({ isDeleted: 1 });

// Auto-generate invite code before save (on create)
workspaceSchema.pre("save", function (next) {
  if (this.isNew && !this.inviteCode) {
    this.inviteCode = crypto.randomBytes(16).toString("hex");
  }
  next();
});

// Static: generate new invite code
workspaceSchema.methods.regenerateInviteCode = function () {
  this.inviteCode = crypto.randomBytes(16).toString("hex");
  return this.save();
};

// Query helper: exclude soft-deleted
workspaceSchema.pre(/^find/, function (next) {
  // Only auto-filter if not explicitly querying deleted
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model("Workspace", workspaceSchema);

