const express = require("express");
const router = express.Router();
const whatsappExternalApiKey = require("../middlewares/whatsappExternalApiKey");
const whatsappController = require("../controllers/whatsapp.controller");

// POST /api/external/whatsapp/send — API key only (no JWT)
router.post("/send", whatsappExternalApiKey, whatsappController.sendExternalMessage);

module.exports = router;
