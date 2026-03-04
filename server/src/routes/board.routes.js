const express = require("express");
const router = express.Router({ mergeParams: true });
const boardController = require("../controllers/board.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

// Semua route memerlukan autentikasi + membership workspace
router.use(auth);

// ── Board List & Create ─────────────────────────────
router.get("/", workspaceMember(), boardController.listBoards);
router.post(
  "/",
  workspaceMember("owner", "admin", "member"),
  boardController.createBoard,
);

// ── Board Detail ────────────────────────────────────
router.get("/:boardId", workspaceMember(), boardController.getBoard);
router.put(
  "/:boardId",
  workspaceMember("owner", "admin", "member"),
  boardController.updateBoard,
);
router.delete(
  "/:boardId",
  workspaceMember("owner", "admin", "member"),
  boardController.deleteBoard,
);

// ── Board Duplicate ─────────────────────────────────
router.post(
  "/:boardId/duplicate",
  workspaceMember("owner", "admin", "member"),
  boardController.duplicateBoard,
);

// ── Widgets ─────────────────────────────────────────
router.post(
  "/:boardId/widgets",
  workspaceMember("owner", "admin", "member"),
  boardController.addWidget,
);
router.put(
  "/:boardId/widgets/:widgetId",
  workspaceMember("owner", "admin", "member"),
  boardController.updateWidget,
);
router.delete(
  "/:boardId/widgets/:widgetId",
  workspaceMember("owner", "admin", "member"),
  boardController.deleteWidget,
);

// ── Connections ─────────────────────────────────────
router.post(
  "/:boardId/connections",
  workspaceMember("owner", "admin", "member"),
  boardController.addConnection,
);
router.put(
  "/:boardId/connections/:connId",
  workspaceMember("owner", "admin", "member"),
  boardController.updateConnection,
);
router.delete(
  "/:boardId/connections/:connId",
  workspaceMember("owner", "admin", "member"),
  boardController.deleteConnection,
);

module.exports = router;
