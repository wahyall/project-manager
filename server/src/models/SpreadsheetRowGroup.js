const mongoose = require("mongoose");

// ── SpreadsheetRowGroup ──────────────────────────────
const spreadsheetRowGroupSchema = new mongoose.Schema(
  {
    sheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpreadsheetSheet",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Nama grup harus diisi"],
      trim: true,
      maxlength: [100, "Nama grup maksimal 100 karakter"],
      default: "Group",
    },
    parentGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpreadsheetRowGroup",
      default: null,
    },
    isCollapsed: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ──────────────────────────────────────────
spreadsheetRowGroupSchema.index({ sheetId: 1, order: 1 });

module.exports = mongoose.model(
  "SpreadsheetRowGroup",
  spreadsheetRowGroupSchema,
);

