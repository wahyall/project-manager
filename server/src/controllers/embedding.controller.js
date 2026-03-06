const EmbeddingService = require("../services/embedding.service");
const Embedding = require("../models/Embedding");
const catchAsync = require("../utils/catchAsync");

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/embeddings/sync — Manual re-index
// ──────────────────────────────────────────────
exports.syncEmbeddings = catchAsync(async (req, res) => {
  const workspaceId = req.workspace._id;

  const result = await EmbeddingService.syncWorkspace(workspaceId);

  res.status(200).json({
    status: "success",
    message: `Re-index selesai: ${result.total} embeddings`,
    data: result,
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/embeddings/stats — Statistik
// ──────────────────────────────────────────────
exports.getEmbeddingStats = catchAsync(async (req, res) => {
  const workspaceId = req.workspace._id;

  const stats = await Embedding.aggregate([
    { $match: { workspaceId } },
    {
      $group: {
        _id: "$sourceType",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Format menjadi object
  const byType = {};
  let total = 0;
  for (const s of stats) {
    byType[s._id] = s.count;
    total += s.count;
  }

  res.status(200).json({
    status: "success",
    data: {
      total,
      byType,
    },
  });
});
