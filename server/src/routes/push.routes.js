const express = require("express");
const protect = require("../middlewares/auth");
const {
  subscribe,
  unsubscribe,
  getVapidPublicKey,
} = require("../controllers/push.controller");

const router = express.Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", protect, subscribe);
router.post("/unsubscribe", protect, unsubscribe);

module.exports = router;
