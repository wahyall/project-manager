const whatsappService = require("../services/whatsapp.service");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/whatsapp/status
// ──────────────────────────────────────────────
exports.getStatus = catchAsync(async (req, res, next) => {
  const status = whatsappService.getStatus(req.params.id);

  res.status(200).json({
    status: "success",
    data: status,
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/whatsapp/qr
// ──────────────────────────────────────────────
exports.getQR = catchAsync(async (req, res, next) => {
  const status = whatsappService.getStatus(req.params.id);

  if (status.connected) {
    return res.status(200).json({
      status: "success",
      message: "WhatsApp is already connected",
      data: { qrCodeStr: null },
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      qrCodeStr: status.qrCodeStr,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/whatsapp/reconnect
// ──────────────────────────────────────────────
exports.reconnect = catchAsync(async (req, res, next) => {
  // Trigger reconnection asynchronously to not block
  whatsappService.reconnect(req.params.id);

  res.status(200).json({
    status: "success",
    message:
      "Reconnection process started. Please check status in a few seconds.",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/whatsapp/test
// ──────────────────────────────────────────────
exports.testMessage = catchAsync(async (req, res, next) => {
  const { number, message } = req.body;
  const workspaceId = req.params.id;

  if (!number || !message) {
    return next(new AppError("Nomor telepon dan pesan wajib diisi", 400));
  }

  const status = whatsappService.getStatus(workspaceId);
  if (!status.connected) {
    return next(new AppError("WhatsApp tidak terhubung", 400));
  }

  // Queue message
  const log = await whatsappService.queueMessage({
    workspaceId,
    recipientId: req.user.id, // Just track the admin who sent the test
    recipientNumber: number,
    type: "mention", // Fake it for testing
    message: `[TEST] ${message}`,
  });

  res.status(200).json({
    status: "success",
    message: "Pesan percobaan ditambahkan ke antrian",
    data: { logId: log._id },
  });
});

// ──────────────────────────────────────────────
// POST /api/external/whatsapp/send
// ──────────────────────────────────────────────
exports.sendExternalMessage = catchAsync(async (req, res, next) => {
  const { number, message, workspaceId } = req.body;

  if (!workspaceId) {
    return next(new AppError("workspaceId is required", 400));
  }

  if (!number || !message) {
    return next(new AppError("number and message are required", 400));
  }

  const status = whatsappService.getStatus(workspaceId);
  if (!status.connected) {
    return next(new AppError("WhatsApp is not connected for this workspace", 503));
  }

  const log = await whatsappService.queueMessage({
    workspaceId,
    recipientNumber: number,
    type: "external",
    message: String(message),
  });

  if (!log) {
    return next(new AppError("Failed to queue message", 500));
  }

  res.status(200).json({
    status: "success",
    message: "Message queued",
    data: { logId: log._id },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/whatsapp/logs
// ──────────────────────────────────────────────
exports.getLogs = catchAsync(async (req, res, next) => {
  const { limit = 20, page = 1 } = req.query;
  const workspaceId = req.params.id;

  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const pageNum = Math.max(1, parseInt(page));
  const skip = (pageNum - 1) * limitNum;

  const { logs, total } = await whatsappService.getRecentLogs(workspaceId, limitNum, skip);

  res.status(200).json({
    status: "success",
    data: {
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});
