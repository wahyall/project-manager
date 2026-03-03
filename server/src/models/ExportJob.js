const mongoose = require("mongoose");

const exportJobSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "task_csv",
        "task_xlsx",
        "task_pdf",
        "event_pdf",
        "spreadsheet_csv",
        "spreadsheet_xlsx",
      ],
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "processing", "completed", "failed"],
    },
    params: {
      filters: { type: mongoose.Schema.Types.Mixed, default: {} },
      targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
      sheetId: { type: mongoose.Schema.Types.ObjectId, default: null },
      scope: { type: String, enum: ["single", "all"], default: null },
    },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: 0 },
    error: { type: String, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
  },
);

// TTL index — auto-delete expired jobs
exportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for querying user's jobs
exportJobSchema.index({ requestedBy: 1, createdAt: -1 });

module.exports = mongoose.model("ExportJob", exportJobSchema);
