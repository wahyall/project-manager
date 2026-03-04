const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/whatsapp.controller");
const auth = require("../middlewares/auth");

// Semua endpoint admin WhatsApp butuh autentikasi global
router.use(auth);

// GET /api/admin/whatsapp/status
router.get("/status", whatsappController.getStatus);

// GET /api/admin/whatsapp/qr
router.get("/qr", whatsappController.getQR);

// POST /api/admin/whatsapp/reconnect
router.post("/reconnect", whatsappController.reconnect);

// POST /api/admin/whatsapp/test
router.post("/test", whatsappController.testMessage);

// GET /api/admin/whatsapp/logs
router.get("/logs", whatsappController.getLogs);

module.exports = router;
