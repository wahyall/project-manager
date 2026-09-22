const express = require("express");
const router = express.Router({ mergeParams: true });
const ideaController = require("../controllers/idea.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

// Semua route memerlukan autentikasi + membership workspace
router.use(auth);

// ── List & Create ───────────────────────────────────
router.get("/", workspaceMember(), ideaController.listIdeas);
router.post(
  "/",
  workspaceMember("owner", "admin", "member"),
  ideaController.createIdea,
);

// ── Detail ──────────────────────────────────────────
router.get("/:ideaId", workspaceMember(), ideaController.getIdea);
router.put(
  "/:ideaId",
  workspaceMember("owner", "admin", "member"),
  ideaController.updateIdea,
);
router.delete(
  "/:ideaId",
  workspaceMember("owner", "admin", "member"),
  ideaController.deleteIdea,
);

// ── Dukungan ────────────────────────────────────────
router.post("/:ideaId/vote", workspaceMember(), ideaController.voteIdea);
router.delete("/:ideaId/vote", workspaceMember(), ideaController.unvoteIdea);

module.exports = router;
