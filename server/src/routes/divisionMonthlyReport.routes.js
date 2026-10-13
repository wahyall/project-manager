const express = require("express");
const router = express.Router({ mergeParams: true });
const divisionMonthlyReportController = require("../controllers/divisionMonthlyReport.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

router.get("/", workspaceMember(), divisionMonthlyReportController.listMonthlyReports);
router.post("/", workspaceMember(), divisionMonthlyReportController.createMonthlyReport);
router.get("/:reportId", workspaceMember(), divisionMonthlyReportController.getMonthlyReport);
router.delete("/:reportId", workspaceMember(), divisionMonthlyReportController.deleteMonthlyReport);

module.exports = router;
