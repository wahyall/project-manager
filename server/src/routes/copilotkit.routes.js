const express = require("express");
const router = express.Router({ mergeParams: true });
const copilotkitController = require("../controllers/copilotkit.controller");
const { protect } = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/workspace");
const { requireRole } = require("../middlewares/rbac");
const { aiChatLimiter } = require("../middlewares/rateLimiter");

router.use(protect);
router.use(workspaceMember());

// Copilot endpoint is protected, and limited to members (admin/member, not guest if we want to block them)
// For now, let's block Guests
router.use(requireRole(["admin", "owner", "member"]));
router.use(aiChatLimiter);

router.post("/", copilotkitController.handleCopilotRequest);

module.exports = router;
