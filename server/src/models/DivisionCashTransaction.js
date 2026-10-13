const mongoose = require("mongoose");

const divisionCashTransactionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    divisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceDivision",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Tipe transaksi harus diisi (income/expense)"],
    },
    amount: {
      type: Number,
      required: [true, "Nominal transaksi harus diisi"],
      min: [0, "Nominal tidak boleh negatif"],
    },
    category: {
      type: String,
      required: [true, "Kategori transaksi harus diisi"],
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    description: {
      type: String,
      required: [true, "Keterangan transaksi harus diisi"],
      trim: true,
      maxlength: [500, "Keterangan maksimal 500 karakter"],
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

divisionCashTransactionSchema.index({ divisionId: 1, date: -1 });

module.exports = mongoose.model(
  "DivisionCashTransaction",
  divisionCashTransactionSchema
);
