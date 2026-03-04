const whatsappService = require("../services/whatsapp.service");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ──────────────────────────────────────────────
// GET /api/admin/whatsapp/status
// ──────────────────────────────────────────────
exports.getStatus = catchAsync(async (req, res, next) => {
  const status = whatsappService.getStatus();

  res.status(200).json({
    status: "success",
    data: status,
  });
});

// ──────────────────────────────────────────────
// GET /api/admin/whatsapp/qr
// ──────────────────────────────────────────────
exports.getQR = catchAsync(async (req, res, next) => {
  const status = whatsappService.getStatus();

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
// POST /api/admin/whatsapp/reconnect
// ──────────────────────────────────────────────
exports.reconnect = catchAsync(async (req, res, next) => {
  // Trigger reconnection asynchronously to not block
  whatsappService.reconnect();

  res.status(200).json({
    status: "success",
    message:
      "Reconnection process started. Please check status in a few seconds.",
  });
});

// ──────────────────────────────────────────────
// POST /api/admin/whatsapp/test
// ──────────────────────────────────────────────
exports.testMessage = catchAsync(async (req, res, next) => {
  const { number, message } = req.body;

  if (!number || !message) {
    return next(new AppError("Nomor telepon dan pesan wajib diisi", 400));
  }

  const status = whatsappService.getStatus();
  if (!status.connected) {
    return next(new AppError("WhatsApp tidak terhubung", 400));
  }

  // Queue message
  const log = await whatsappService.queueMessage({
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
// GET /api/admin/whatsapp/logs
// ──────────────────────────────────────────────
exports.getLogs = catchAsync(async (req, res, next) => {
  const { limit = 20, page = 1 } = req.query;

  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const pageNum = Math.max(1, parseInt(page));
  const skip = (pageNum - 1) * limitNum;

  const { logs, total } = await whatsappService.getRecentLogs(limitNum, skip);

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
