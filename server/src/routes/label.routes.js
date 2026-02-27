const express = require("express");
const router = express.Router({ mergeParams: true });
const labelController = require("../controllers/label.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

// Semua route memerlukan autentikasi + membership workspace
router.use(auth);

// ── List & Create ───────────────────────────────────
router.get("/", workspaceMember(), labelController.listLabels);
router.post(
  "/",
  workspaceMember("owner", "admin", "member"),
  labelController.createLabel,
);

// ── Update & Delete ─────────────────────────────────
router.put(
  "/:labelId",
  workspaceMember("owner", "admin", "member"),
  labelController.updateLabel,
);
router.delete(
  "/:labelId",
  workspaceMember("owner", "admin"),
  labelController.deleteLabel,
);

module.exports = router;
