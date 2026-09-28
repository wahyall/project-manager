const mongoose = require("mongoose");
const { PHASES } = require("../utils/pipelinePhases");

const pipelineTemplateItemSchema = new mongoose.Schema(
  {
    phase: {
      type: String,
      enum: {
        values: PHASES,
        message: `Fase harus salah satu dari: ${PHASES.join(", ")}`,
      },
      required: true,
    },
    title: {
      type: String,
      required: [true, "Judul item harus diisi"],
      trim: true,
      maxlength: [200, "Judul item maksimal 200 karakter"],
    },
    dueDateMode: {
      type: String,
      enum: ["absolute", "relative"],
      required: true,
    },
    dueOffsetDays: {
      type: Number,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true },
);

const pipelineTemplateSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Nama template harus diisi"],
      trim: true,
      maxlength: [100, "Nama template maksimal 100 karakter"],
    },
    description: {
      type: String,
      default: "",
    },
    items: {
      type: [pipelineTemplateItemSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

pipelineTemplateSchema.index({ workspaceId: 1 });

module.exports = mongoose.model("PipelineTemplate", pipelineTemplateSchema);
