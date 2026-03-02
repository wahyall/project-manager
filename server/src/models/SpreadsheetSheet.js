const mongoose = require("mongoose");

// ── Column sub-schema ────────────────────────────────
const columnSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Nama kolom harus diisi"],
      trim: true,
      maxlength: [100, "Nama kolom maksimal 100 karakter"],
    },
    type: {
      type: String,
      enum: {
        values: [
          "text",
          "number",
          "date",
          "checkbox",
          "dropdown",
          "user",
          "url",
        ],
        message: "Tipe kolom tidak valid",
      },
      default: "text",
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    width: {
      type: Number,
      default: 150,
      min: [50, "Lebar kolom minimal 50px"],
      max: [800, "Lebar kolom maksimal 800px"],
    },
    // Dropdown options (only for type: 'dropdown')
    options: {
      type: [String],
      default: undefined,
    },
    // Number format (only for type: 'number')
    numberFormat: {
      type: String,
      enum: ["plain", "decimal", "currency"],
      default: null,
    },
    // Formula type (footer formula)
    formula: {
      type: String,
      enum: ["SUM", "AVERAGE", "COUNT", "MIN", "MAX"],
      default: null,
    },
    // Freeze column
    isFrozen: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true },
);

// ── SpreadsheetSheet ─────────────────────────────────
const spreadsheetSheetSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Nama sheet harus diisi"],
      trim: true,
      maxlength: [50, "Nama sheet maksimal 50 karakter"],
      default: "Sheet 1",
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    columns: {
      type: [columnSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ──────────────────────────────────────────
spreadsheetSheetSchema.index({ eventId: 1, order: 1 });

module.exports = mongoose.model("SpreadsheetSheet", spreadsheetSheetSchema);

