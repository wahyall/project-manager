const mongoose = require("mongoose");

// ── SpreadsheetRow ───────────────────────────────────
const spreadsheetRowSchema = new mongoose.Schema(
  {
    sheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpreadsheetSheet",
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpreadsheetRowGroup",
      default: null,
    },
    // Flexible cell data: { "<columnId>": <value> }
    cells: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map(),
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ──────────────────────────────────────────
spreadsheetRowSchema.index({ sheetId: 1, order: 1 });
spreadsheetRowSchema.index({ sheetId: 1, groupId: 1 });

module.exports = mongoose.model("SpreadsheetRow", spreadsheetRowSchema);

