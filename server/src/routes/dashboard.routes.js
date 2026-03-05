const express = require("express");
const router = express.Router({ mergeParams: true });
const dashboardController = require("../controllers/dashboard.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

// GET /api/workspaces/:id/dashboard
router.get("/", workspaceMember(), dashboardController.getDashboard);

module.exports = router;
