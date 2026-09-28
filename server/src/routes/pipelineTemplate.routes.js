const express = require("express");
const router = express.Router({ mergeParams: true });
const templateController = require("../controllers/pipelineTemplate.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

router.get("/", workspaceMember(), templateController.listTemplates);

router.put(
  "/:templateId",
  workspaceMember("owner", "admin", "member"),
  templateController.updateTemplate,
);

router.delete(
  "/:templateId",
  workspaceMember(),
  templateController.deleteTemplate,
);

module.exports = router;
