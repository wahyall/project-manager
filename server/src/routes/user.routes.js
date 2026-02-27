const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const auth = require("../middlewares/auth");

// Semua route memerlukan autentikasi
router.use(auth);

// Profil
router.get("/me", userController.getProfile);
router.put("/me", userController.updateProfile);

// Password
router.put("/me/password", userController.changePassword);

// Avatar
router.put("/me/avatar", userController.updateAvatar);

// Preferensi Notifikasi
router.put("/me/notifications", userController.updateNotifications);

module.exports = router;

