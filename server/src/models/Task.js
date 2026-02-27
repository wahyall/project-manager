const mongoose = require("mongoose");

// ── Subtask (embedded) ──────────────────────────────
const subtaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Judul subtask harus diisi"],
      trim: true,
      maxlength: [200, "Judul subtask maksimal 200 karakter"],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true },
);

// ── Attachment (embedded) ───────────────────────────
const attachmentSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

// ── Task ────────────────────────────────────────────
const taskSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Judul task harus diisi"],
      trim: true,
      maxlength: [200, "Judul task maksimal 200 karakter"],
    },
    description: {
      type: String,
      default: "",
    },
    columnId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Status kolom harus diisi"],
    },
    columnOrder: {
      type: Number,
      default: 0,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    watchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "critical"],
        message: "Prioritas harus salah satu dari: low, medium, high, critical",
      },
      default: "medium",
    },
    labels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkspaceLabel",
      },
    ],
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    subtasks: {
      type: [subtaskSchema],
      default: [],
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    blockedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
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
taskSchema.index({ workspaceId: 1, isDeleted: 1 });
taskSchema.index({ workspaceId: 1, columnId: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ eventId: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ workspaceId: 1, isArchived: 1 });
taskSchema.index({ columnId: 1, columnOrder: 1 });

// ── Pre-find: exclude soft-deleted ──────────────────
taskSchema.pre(/^find/, function (next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model("Task", taskSchema);
