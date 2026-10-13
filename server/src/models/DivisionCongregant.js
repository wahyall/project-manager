const mongoose = require("mongoose");

const divisionCongregantSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: [true, "Nama jamaah harus diisi"],
      trim: true,
      maxlength: [120, "Nama maksimal 120 karakter"],
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      enum: ["mustahik", "donatur", "jamaah_rutin", "lainnya"],
      default: "jamaah_rutin",
    },
    notes: {
      type: String,
      default: "",
    },
    lastVisitedAt: {
      type: Date,
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

divisionCongregantSchema.index({ workspaceId: 1, divisionId: 1, name: 1 });

module.exports = mongoose.model("DivisionCongregant", divisionCongregantSchema);
