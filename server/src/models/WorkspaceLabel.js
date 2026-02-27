const mongoose = require("mongoose");

const workspaceLabelSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Nama label harus diisi"],
      trim: true,
      maxlength: [50, "Nama label maksimal 50 karakter"],
    },
    color: {
      type: String,
      required: [true, "Warna label harus diisi"],
      match: [
        /^#([0-9A-Fa-f]{6})$/,
        "Format warna harus hex (contoh: #FF5733)",
      ],
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────
workspaceLabelSchema.index({ workspaceId: 1 });
workspaceLabelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("WorkspaceLabel", workspaceLabelSchema);
