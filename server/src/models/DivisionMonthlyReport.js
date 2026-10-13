const mongoose = require("mongoose");

const divisionMonthlyReportSchema = new mongoose.Schema(
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
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    summaryCash: {
      totalIncome: { type: Number, default: 0 },
      totalExpense: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
    },
    summaryInfaq: {
      totalCollected: { type: Number, default: 0 },
      paidMembersCount: { type: Number, default: 0 },
      totalMembersCount: { type: Number, default: 0 },
    },
    summaryJamaah: {
      totalCongregants: { type: Number, default: 0 },
    },
    summaryIssues: {
      openCount: { type: Number, default: 0 },
      inProgressCount: { type: Number, default: 0 },
      resolvedCount: { type: Number, default: 0 },
    },
    notes: {
      type: String,
      default: "",
    },
    isLocked: {
      type: Boolean,
      default: true,
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

divisionMonthlyReportSchema.index(
  { divisionId: 1, month: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "DivisionMonthlyReport",
  divisionMonthlyReportSchema
);
