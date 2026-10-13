const express = require("express");
const router = express.Router({ mergeParams: true });
const divisionInfaqController = require("../controllers/divisionInfaq.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

router.get("/", workspaceMember(), divisionInfaqController.getInfaqRecords);
router.post("/", workspaceMember(), divisionInfaqController.recordInfaq);

module.exports = router;
