const express = require("express");
const router = express.Router({ mergeParams: true });
const divisionIssueController = require("../controllers/divisionIssue.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

router.get("/", workspaceMember(), divisionIssueController.listIssues);
router.post("/", workspaceMember(), divisionIssueController.createIssue);
router.put("/:issueId", workspaceMember(), divisionIssueController.updateIssue);
router.delete("/:issueId", workspaceMember(), divisionIssueController.deleteIssue);

module.exports = router;
