const PipelineTemplate = require("../models/PipelineTemplate");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// GET /api/workspaces/:id/pipeline-templates
exports.listTemplates = catchAsync(async (req, res) => {
  const workspace = req.workspace;
  const templates = await PipelineTemplate.find({ workspaceId: workspace._id })
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ status: "success", data: { templates } });
});

// PUT /api/workspaces/:id/pipeline-templates/:templateId
exports.updateTemplate = catchAsync(async (req, res, next) => {
  const { templateId } = req.params;
  const workspace = req.workspace;
  const { name, description, items } = req.body;

  const template = await PipelineTemplate.findOne({
    _id: templateId,
    workspaceId: workspace._id,
  });
  if (!template) {
    return next(new AppError("Template tidak ditemukan", 404));
  }

  if (name !== undefined) {
    if (!name.trim()) {
      return next(new AppError("Nama template tidak boleh kosong", 400));
    }
    template.name = name.trim();
  }
  if (description !== undefined) template.description = description;
  if (items !== undefined) template.items = items;

  await template.save();

  res.status(200).json({ status: "success", data: { template } });
});

// DELETE /api/workspaces/:id/pipeline-templates/:templateId
exports.deleteTemplate = catchAsync(async (req, res, next) => {
  const { templateId } = req.params;
  const workspace = req.workspace;

  const template = await PipelineTemplate.findOneAndDelete({
    _id: templateId,
    workspaceId: workspace._id,
  });
  if (!template) {
    return next(new AppError("Template tidak ditemukan", 404));
  }

  res.status(200).json({ status: "success", message: "Template dihapus" });
});
