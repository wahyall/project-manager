const express = require("express");
const router = express.Router();
const exportController = require("../controllers/export.controller");
const auth = require("../middlewares/auth");

// All routes require authentication
router.use(auth);

// ── Export Job Status & Download ────────────────────
router.get("/:jobId", exportController.getJobStatus);
router.get("/:jobId/download", exportController.downloadJobFile);

module.exports = router;
