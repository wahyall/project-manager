const express = require("express");
const router = express.Router({ mergeParams: true });
const calendarController = require("../controllers/calendar.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

// All routes require authentication + workspace membership
router.use(auth);

// GET /api/workspaces/:id/calendar
router.get("/", workspaceMember(), calendarController.getCalendarData);

module.exports = router;

