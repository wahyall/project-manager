const express = require("express");
const router = express.Router({ mergeParams: true });
const taskController = require("../controllers/task.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");
const { handleUpload } = require("../middlewares/upload");

// Semua route memerlukan autentikasi + membership workspace
// Guest tidak bisa CRUD task (hanya bisa lihat via workspace)
router.use(auth);

// ── List & Create ───────────────────────────────────
router.get("/", workspaceMember(), taskController.listTasks);
router.post(
  "/",
  workspaceMember("owner", "admin", "member"),
  taskController.createTask,
);

// ── Bulk archive done ───────────────────────────────
router.post(
  "/archive-done",
  workspaceMember("owner", "admin", "member"),
  taskController.bulkArchiveDone,
);

// ── Task detail ─────────────────────────────────────
router.get("/:taskId", workspaceMember(), taskController.getTask);
router.put(
  "/:taskId",
  workspaceMember("owner", "admin", "member"),
  taskController.updateTask,
);
router.delete(
  "/:taskId",
  workspaceMember("owner", "admin", "member"),
  taskController.deleteTask,
);

// ── Archive / Unarchive ─────────────────────────────
router.post(
  "/:taskId/archive",
  workspaceMember("owner", "admin", "member"),
  taskController.archiveTask,
);
router.post(
  "/:taskId/unarchive",
  workspaceMember("owner", "admin", "member"),
  taskController.unarchiveTask,
);

// ── Watch / Unwatch ─────────────────────────────────
router.post(
  "/:taskId/watch",
  workspaceMember("owner", "admin", "member"),
  taskController.watchTask,
);
router.delete(
  "/:taskId/watch",
  workspaceMember("owner", "admin", "member"),
  taskController.unwatchTask,
);

// ── Attachments ─────────────────────────────────────
router.post(
  "/:taskId/attachments",
  workspaceMember("owner", "admin", "member"),
  handleUpload,
  taskController.uploadAttachment,
);
router.delete(
  "/:taskId/attachments/:attachmentId",
  workspaceMember("owner", "admin", "member"),
  taskController.deleteAttachment,
);

module.exports = router;
