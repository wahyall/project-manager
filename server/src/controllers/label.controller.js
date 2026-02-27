const WorkspaceLabel = require("../models/WorkspaceLabel");
const Task = require("../models/Task");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/labels — Daftar label
// ──────────────────────────────────────────────
exports.listLabels = catchAsync(async (req, res) => {
  const { id: workspaceId } = req.params;

  const labels = await WorkspaceLabel.find({ workspaceId })
    .sort({ name: 1 })
    .lean();

  res.status(200).json({
    status: "success",
    data: { labels },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/labels — Buat label
// ──────────────────────────────────────────────
exports.createLabel = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const { name, color } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError("Nama label harus diisi", 400));
  }

  if (!color) {
    return next(new AppError("Warna label harus diisi", 400));
  }

  // Check duplicate name in workspace
  const existing = await WorkspaceLabel.findOne({
    workspaceId: workspace._id,
    name: name.trim(),
  });

  if (existing) {
    return next(
      new AppError("Label dengan nama ini sudah ada di workspace", 409),
    );
  }

  const label = await WorkspaceLabel.create({
    workspaceId: workspace._id,
    name: name.trim(),
    color,
  });

  res.status(201).json({
    status: "success",
    data: { label },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/labels/:labelId — Update
// ──────────────────────────────────────────────
exports.updateLabel = catchAsync(async (req, res, next) => {
  const { labelId } = req.params;
  const workspace = req.workspace;
  const { name, color } = req.body;

  const label = await WorkspaceLabel.findOne({
    _id: labelId,
    workspaceId: workspace._id,
  });

  if (!label) {
    return next(new AppError("Label tidak ditemukan", 404));
  }

  if (name !== undefined) {
    if (!name.trim()) {
      return next(new AppError("Nama label tidak boleh kosong", 400));
    }
    // Check duplicate name
    const existing = await WorkspaceLabel.findOne({
      workspaceId: workspace._id,
      name: name.trim(),
      _id: { $ne: labelId },
    });
    if (existing) {
      return next(new AppError("Label dengan nama ini sudah ada", 409));
    }
    label.name = name.trim();
  }

  if (color !== undefined) {
    label.color = color;
  }

  await label.save();

  res.status(200).json({
    status: "success",
    data: { label },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/labels/:labelId — Hapus
// ──────────────────────────────────────────────
exports.deleteLabel = catchAsync(async (req, res, next) => {
  const { labelId } = req.params;
  const workspace = req.workspace;

  const label = await WorkspaceLabel.findOne({
    _id: labelId,
    workspaceId: workspace._id,
  });

  if (!label) {
    return next(new AppError("Label tidak ditemukan", 404));
  }

  // Remove label from all tasks that use it
  await Task.updateMany(
    { workspaceId: workspace._id, labels: labelId },
    { $pull: { labels: labelId } },
  );

  await label.deleteOne();

  res.status(200).json({
    status: "success",
    message: "Label berhasil dihapus",
  });
});
