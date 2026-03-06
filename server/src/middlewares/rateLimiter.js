const rateLimit = require("express-rate-limit");

exports.aiChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 30, // Limit 30 request per window (per minute)
  message: {
    status: "fail",
    message: "Terlalu banyak request dari IP ini, coba lagi nanti.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
