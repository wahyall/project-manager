const express = require("express");
const router = express.Router({ mergeParams: true });
const exportController = require("../controllers/export.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

// All routes require authentication + workspace membership
router.use(auth);

const canView = workspaceMember();

// ── Task Exports ────────────────────────────────────
router.post("/tasks/csv", canView, exportController.exportTaskCSV);
router.post("/tasks/xlsx", canView, exportController.exportTaskXLSX);
router.post("/tasks/pdf", canView, exportController.exportTaskPDF);

// ── Event Exports ───────────────────────────────────
router.post("/events/:eventId/pdf", canView, exportController.exportEventPDF);

module.exports = router;
