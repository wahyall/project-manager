const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

/**
 * Middleware untuk memverifikasi JWT token dari header Authorization
 * atau dari httpOnly cookie
 */
const auth = (req, res, next) => {
  let token;

  // Cek Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Cek cookie sebagai fallback
  if (!token && req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(
      new AppError("Silakan login untuk mengakses resource ini", 401),
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new AppError("Token sudah expired, silakan login ulang", 401),
      );
    }
    return next(new AppError("Token tidak valid", 401));
  }
};

module.exports = auth;
