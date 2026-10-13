const express = require("express");
const router = express.Router({ mergeParams: true });
const divisionController = require("../controllers/workspaceDivision.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

// ── List & Create — Divisi Workspace ────────────────
router.get("/", workspaceMember(), divisionController.listDivisions);
router.post(
  "/",
  workspaceMember("owner", "admin", "member"),
  divisionController.createDivision,
);

// ── Division detail ─────────────────────────────────
router.put(
  "/:divisionId",
  workspaceMember("owner", "admin", "member"),
  divisionController.updateDivision,
);
router.delete(
  "/:divisionId",
  workspaceMember("owner", "admin", "member"),
  divisionController.deleteDivision,
);

// ── Division members ────────────────────────────────
router.post(
  "/:divisionId/members",
  workspaceMember("owner", "admin", "member"),
  divisionController.addMember,
);
router.put(
  "/:divisionId/members/:userId",
  workspaceMember("owner", "admin", "member"),
  divisionController.updateMemberRole,
);
router.delete(
  "/:divisionId/members/:userId",
  workspaceMember("owner", "admin", "member"),
  divisionController.removeMember,
);

// ── Move member between divisions ───────────────────
router.post(
  "/:divisionId/members/:userId/move",
  workspaceMember("owner", "admin", "member"),
  divisionController.moveMember,
);

// ── Division Google Spreadsheet ─────────────────────
router.post(
  "/:divisionId/google-sheet",
  workspaceMember("owner", "admin", "member"),
  divisionController.createDivisionGoogleSpreadsheet,
);
router.post(
  "/:divisionId/google-sheet/sync",
  workspaceMember("owner", "admin", "member"),
  divisionController.syncDivisionGoogleSpreadsheet,
);

module.exports = router;

