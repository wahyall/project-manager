const mongoose = require("mongoose");
const { PHASES } = require("../utils/pipelinePhases");

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
    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
      maxlength: [1000, "Catatan subtask maksimal 1000 karakter"],
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true },
);

// ── PIC per divisi (embedded) ───────────────────────
const divisionPicSchema = new mongoose.Schema(
  {
    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false },
);

// ── Kolom koordinasi (embedded) ─────────────────────
const coordinationSchema = new mongoose.Schema(
  {
    constraints: {
      type: String,
      default: "",
      maxlength: [2000, "Kendala maksimal 2000 karakter"],
    },
    helpNeeded: {
      type: String,
      default: "",
      maxlength: [2000, "Bantuan yang dibutuhkan maksimal 2000 karakter"],
    },
    followUp: {
      type: String,
      default: "",
      maxlength: [2000, "Tindak lanjut maksimal 2000 karakter"],
    },
  },
  { _id: false },
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
    // Divisi Workspace pemilik task ini. null = "Tanpa Divisi".
    // Saat task dibuat dari event tanpa divisionId eksplisit,
    // otomatis mengikuti divisionId event tersebut.
    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      default: null,
    },
    // Semua divisi yang terlibat, termasuk divisionId (divisi utama/peminta).
    divisionIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "WorkspaceDivision",
        },
      ],
      default: [],
    },
    // Satu PIC per divisi yang terlibat.
    divisionPics: {
      type: [divisionPicSchema],
      default: [],
    },
    // Kolom koordinasi antar-divisi.
    coordination: {
      type: coordinationSchema,
      default: () => ({}),
    },
    phase: {
      type: String,
      enum: {
        values: PHASES,
        message: `Fase harus salah satu dari: ${PHASES.join(", ")}`,
      },
      default: null,
    },
    dueDateMode: {
      type: String,
      enum: ["absolute", "relative"],
      default: null,
    },
    dueOffsetDays: {
      type: Number,
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
taskSchema.index({ workspaceId: 1, divisionId: 1 });
taskSchema.index({ workspaceId: 1, divisionIds: 1 });
taskSchema.index({ "divisionPics.userId": 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ eventId: 1 });
taskSchema.index({ eventId: 1, phase: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ workspaceId: 1, isArchived: 1 });
taskSchema.index({ columnId: 1, columnOrder: 1 });

// ── Pre-validate: jaga konsistensi divisi ───────────
taskSchema.pre("validate", function (next) {
  const toObjectId = (value) => {
    if (!value) return null;
    const raw = value._id || value;
    if (raw instanceof mongoose.Types.ObjectId) return raw;
    if (mongoose.Types.ObjectId.isValid(raw)) {
      return new mongoose.Types.ObjectId(raw);
    }
    return null;
  };

  const ids = [];
  for (const value of this.divisionIds || []) {
    const id = toObjectId(value);
    if (id && !ids.some((existing) => existing.equals(id))) {
      ids.push(id);
    }
  }

  const primary = toObjectId(this.divisionId);
  if (primary && !ids.some((id) => id.equals(primary))) {
    ids.unshift(primary);
  }
  if (!primary && ids.length > 0) {
    this.divisionId = ids[0];
  }

  this.divisionIds = ids;

  // Jangan simpan PIC untuk divisi yang tidak lagi terlibat.
  const validIds = new Set(ids.map((id) => id.toString()));
  this.divisionPics = (this.divisionPics || []).filter((pic) =>
    validIds.has(pic.divisionId?.toString()),
  );

  next();
});

// ── Pre-find: exclude soft-deleted ──────────────────
taskSchema.pre(/^find/, function (next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model("Task", taskSchema);
