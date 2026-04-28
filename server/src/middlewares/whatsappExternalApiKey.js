const crypto = require("crypto");
const AppError = require("../utils/AppError");

/**
 * Validates WHATSAPP_EXTERNAL_API_KEY from X-API-Key or Authorization: Bearer <key>.
 * No JWT session — intended for server-to-server or trusted callers only.
 */
module.exports = (req, res, next) => {
  const expected = process.env.WHATSAPP_EXTERNAL_API_KEY;
  if (!expected || !String(expected).trim()) {
    return next(
      new AppError("External WhatsApp messaging is not configured", 503),
    );
  }

  const fromHeader = req.headers["x-api-key"];
  const auth = req.headers.authorization;
  const fromBearer =
    auth && auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  const provided =
    (typeof fromHeader === "string" && fromHeader) ||
    (typeof fromBearer === "string" && fromBearer) ||
    "";

  if (!provided) {
    return next(new AppError("Missing API key", 401));
  }

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(String(expected), "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(new AppError("Invalid API key", 401));
  }

  next();
};
