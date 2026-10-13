const mongoose = require("mongoose");

const divisionIssueSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      required: true,
    },
    type: {
      type: String,
      enum: ["internal_issue", "cross_division_help"],
      default: "internal_issue",
    },
    targetDivisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Judul kendala harus diisi"],
      trim: true,
      maxlength: [200, "Judul maksimal 200 karakter"],
    },
    description: {
      type: String,
      default: "",
    },
    picId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    targetPicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
    actionPlan: {
      type: String,
      default: "",
    },
    month: {
      type: Number,
      default: () => new Date().getMonth() + 1,
    },
    year: {
      type: Number,
      default: () => new Date().getFullYear(),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

divisionIssueSchema.index({ workspaceId: 1, divisionId: 1, status: 1 });
divisionIssueSchema.index({ workspaceId: 1, targetDivisionId: 1 });

module.exports = mongoose.model("DivisionIssue", divisionIssueSchema);
