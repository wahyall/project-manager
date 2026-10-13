const express = require("express");
const router = express.Router({ mergeParams: true });
const divisionCashController = require("../controllers/divisionCash.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

router.use(auth);

// Cash transactions
router.get("/", workspaceMember(), divisionCashController.getCashSummaryAndList);
router.post("/", workspaceMember(), divisionCashController.createTransaction);
router.put("/:transactionId", workspaceMember(), divisionCashController.updateTransaction);
router.delete("/:transactionId", workspaceMember(), divisionCashController.deleteTransaction);

module.exports = router;
