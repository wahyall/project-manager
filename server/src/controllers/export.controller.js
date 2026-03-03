const fs = require("fs");
const path = require("path");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const ExportJob = require("../models/ExportJob");
const exportService = require("../services/export.service");

// ════════════════════════════════════════════════
// Helper: create job and run async
// ════════════════════════════════════════════════

async function createAndRunJob(type, workspaceId, userId, params = {}) {
  const job = await ExportJob.create({
    workspaceId,
    requestedBy: userId,
    type,
    params,
  });

  // Run in background (non-blocking)
  setImmediate(() => {
    exportService.runJob(job._id).catch((err) => {
      console.error(`Export job ${job._id} failed:`, err);
    });
  });

  return job;
}

// ════════════════════════════════════════════════
// POST /api/workspaces/:id/export/tasks/csv
// ════════════════════════════════════════════════

exports.exportTaskCSV = catchAsync(async (req, res, next) => {
  const workspaceId = req.params.id;
  const userId = req.user.id;
  const filters = req.body.filters || {};

  // For small exports, try instant download
  try {
    const { content, count } = await exportService.generateTaskCSV(
      workspaceId,
      filters,
    );

    // If count <= 100, serve directly
    if (count <= 100) {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="tasks_${Date.now()}.csv"`,
      );
      return res.status(200).send(content);
    }
  } catch (err) {
    if (err.message === "Tidak ada data task untuk di-export") {
      return next(new AppError(err.message, 404));
    }
  }

  // Otherwise, background job
  const job = await createAndRunJob("task_csv", workspaceId, userId, {
    filters,
  });
  res.status(202).json({
    status: "accepted",
    data: {
      jobId: job._id,
      message: "Export sedang diproses...",
    },
  });
});

// ════════════════════════════════════════════════
// POST /api/workspaces/:id/export/tasks/xlsx
// ════════════════════════════════════════════════

exports.exportTaskXLSX = catchAsync(async (req, res, next) => {
  const workspaceId = req.params.id;
  const userId = req.user.id;
  const filters = req.body.filters || {};

  const job = await createAndRunJob("task_xlsx", workspaceId, userId, {
    filters,
  });
  res.status(202).json({
    status: "accepted",
    data: {
      jobId: job._id,
      message: "Export sedang diproses...",
    },
  });
});

// ════════════════════════════════════════════════
// POST /api/workspaces/:id/export/tasks/pdf
// ════════════════════════════════════════════════

exports.exportTaskPDF = catchAsync(async (req, res, next) => {
  const workspaceId = req.params.id;
  const userId = req.user.id;
  const filters = req.body.filters || {};

  const job = await createAndRunJob("task_pdf", workspaceId, userId, {
    filters,
  });
  res.status(202).json({
    status: "accepted",
    data: {
      jobId: job._id,
      message: "Export sedang diproses...",
    },
  });
});

// ════════════════════════════════════════════════
// POST /api/workspaces/:id/export/events/:eventId/pdf
// ════════════════════════════════════════════════

exports.exportEventPDF = catchAsync(async (req, res, next) => {
  const workspaceId = req.params.id;
  const { eventId } = req.params;
  const userId = req.user.id;

  const job = await createAndRunJob("event_pdf", workspaceId, userId, {
    targetId: eventId,
  });
  res.status(202).json({
    status: "accepted",
    data: {
      jobId: job._id,
      message: "Export sedang diproses...",
    },
  });
});

// ════════════════════════════════════════════════
// GET /api/export-jobs/:jobId — Status
// ════════════════════════════════════════════════

exports.getJobStatus = catchAsync(async (req, res, next) => {
  const { jobId } = req.params;
  const userId = req.user.id;

  const job = await ExportJob.findOne({
    _id: jobId,
    requestedBy: userId,
  }).lean();

  if (!job) {
    return next(new AppError("Export job tidak ditemukan", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      job: {
        _id: job._id,
        type: job.type,
        status: job.status,
        fileName: job.fileName,
        fileSize: job.fileSize,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      },
    },
  });
});

// ════════════════════════════════════════════════
// GET /api/export-jobs/:jobId/download — Download
// ════════════════════════════════════════════════

exports.downloadJobFile = catchAsync(async (req, res, next) => {
  const { jobId } = req.params;
  const userId = req.user.id;

  const job = await ExportJob.findOne({
    _id: jobId,
    requestedBy: userId,
  }).lean();

  if (!job) {
    return next(new AppError("Export job tidak ditemukan", 404));
  }

  if (job.status !== "completed") {
    return next(new AppError("File belum siap untuk di-download", 400));
  }

  const filePath = path.join(exportService.EXPORTS_DIR, job.fileName);
  if (!fs.existsSync(filePath)) {
    return next(new AppError("File export sudah kadaluarsa atau dihapus", 404));
  }

  // Determine content type
  const ext = path.extname(job.fileName).toLowerCase();
  const contentTypes = {
    ".csv": "text/csv; charset=utf-8",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pdf": "application/pdf",
    ".png": "image/png",
  };

  res.setHeader(
    "Content-Type",
    contentTypes[ext] || "application/octet-stream",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(job.fileName)}"`,
  );
  res.setHeader("Content-Length", job.fileSize);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});
