const express = require("express");
const router = express.Router({ mergeParams: true });
const whatsappController = require("../controllers/whatsapp.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

// Semua endpoint admin WhatsApp butuh autentikasi global dan status owner di workspace
router.use(auth);
router.use(workspaceMember("owner"));

// GET /api/workspaces/:id/whatsapp/status
router.get("/status", whatsappController.getStatus);

// GET /api/workspaces/:id/whatsapp/qr
router.get("/qr", whatsappController.getQR);

// POST /api/workspaces/:id/whatsapp/reconnect
router.post("/reconnect", whatsappController.reconnect);

// POST /api/workspaces/:id/whatsapp/test
router.post("/test", whatsappController.testMessage);

// GET /api/workspaces/:id/whatsapp/logs
router.get("/logs", whatsappController.getLogs);

module.exports = router;
