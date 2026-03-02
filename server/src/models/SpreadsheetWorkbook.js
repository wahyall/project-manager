const mongoose = require("mongoose");

/**
 * SpreadsheetWorkbook
 *
 * Stores FortuneSheet workbook `data` directly (array of Sheet objects),
 * following FortuneSheet's built-in structure.
 *
 * Ref: https://ruilisi.github.io/fortune-sheet-docs/guide/sheet.html
 */
const spreadsheetWorkbookSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
      index: true,
    },

    // FortuneSheet Workbook `data` prop (array of sheets)
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },

    version: {
      type: Number,
      default: 1,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SpreadsheetWorkbook", spreadsheetWorkbookSchema);


