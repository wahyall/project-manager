const express = require("express");
const router = express.Router({ mergeParams: true });
const divisionCongregantController = require("../controllers/divisionCongregant.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

router.get("/", workspaceMember(), divisionCongregantController.listCongregants);
router.post("/", workspaceMember(), divisionCongregantController.createCongregant);
router.put("/:congregantId", workspaceMember(), divisionCongregantController.updateCongregant);
router.delete("/:congregantId", workspaceMember(), divisionCongregantController.deleteCongregant);

module.exports = router;
