const multer = require("multer");
const AppError = require("../utils/AppError");

// Tipe file yang diizinkan
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

// Batas ukuran file: 1MB
const MAX_FILE_SIZE = 1 * 1024 * 1024;

/**
 * Multer config untuk upload lampiran task
 * Menggunakan memory storage karena file akan di-forward ke Puter.js
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          "Tipe file tidak diizinkan. Hanya gambar (JPG, PNG, GIF, WebP) dan PDF yang diperbolehkan.",
          400,
        ),
        false,
      );
    }
  },
});

// Middleware untuk upload single file (field name: "file")
const uploadAttachment = upload.single("file");

// Wrapper untuk handling multer errors
const handleUpload = (req, res, next) => {
  uploadAttachment(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("Ukuran file melebihi batas 1MB", 400));
      }
      return next(new AppError(`Upload error: ${err.message}`, 400));
    }
    if (err) {
      return next(err);
    }
    next();
  });
};

module.exports = { handleUpload, ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
