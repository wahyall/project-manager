const express = require("express");
const router = express.Router({ mergeParams: true });
const pipelineController = require("../controllers/eventPipeline.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

router.get("/", workspaceMember(), pipelineController.listPipeline);

router.post(
  "/tasks",
  workspaceMember("owner", "admin", "member"),
  pipelineController.createPipelineTask,
);

router.post(
  "/apply-template",
  workspaceMember("owner", "admin", "member"),
  pipelineController.applyTemplate,
);

router.post(
  "/save-as-template",
  workspaceMember("owner", "admin", "member"),
  pipelineController.saveAsTemplate,
);

module.exports = router;
