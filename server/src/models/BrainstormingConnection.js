const mongoose = require("mongoose");

// ── Brainstorming Connection ────────────────────────
const brainstormingConnectionSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrainstormingBoard",
      required: true,
    },
    fromWidgetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrainstormingWidget",
      required: true,
    },
    fromSide: {
      type: String,
      enum: ["top", "right", "bottom", "left"],
      default: "right",
    },
    toWidgetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrainstormingWidget",
      required: true,
    },
    toSide: {
      type: String,
      enum: ["top", "right", "bottom", "left"],
      default: "left",
    },
    lineStyle: {
      type: String,
      enum: ["solid", "dashed", "dotted"],
      default: "solid",
    },
    color: {
      type: String,
      default: "#6b7280",
      match: [
        /^#([0-9A-Fa-f]{6})$/,
        "Format warna harus hex (contoh: #6b7280)",
      ],
    },
    arrowType: {
      type: String,
      enum: ["none", "one-way", "two-way"],
      default: "one-way",
    },
    label: {
      type: String,
      default: null,
      maxlength: [200, "Label koneksi maksimal 200 karakter"],
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────
brainstormingConnectionSchema.index({ boardId: 1 });

module.exports = mongoose.model(
  "BrainstormingConnection",
  brainstormingConnectionSchema,
);
