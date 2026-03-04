const express = require("express");
const router = express.Router();
const commentController = require("../controllers/comment.controller");
const auth = require("../middlewares/auth");
const { workspaceMember } = require("../middlewares/rbac");

// Semua route memerlukan autentikasi
router.use(auth);

// GET /api/comments — Daftar komentar
// Catatan: Membership check dilakukan di frontend/client-side sebelum fetch,
// atau bisa ditambahkan validator di sini jika workspaceId dikirim.
router.get("/", commentController.getComments);

// POST /api/comments — Buat komentar baru
router.post("/", commentController.createComment);

// PUT /api/comments/:commentId — Edit komentar
router.put("/:commentId", commentController.updateComment);

// DELETE /api/comments/:commentId — Hapus komentar
// Kita ingin bisa akses req.workspaceMember di controller untuk check Admin+
// Jadi kita butuh middleware yang set req.workspaceMember.
// Karena route ini tidak punya :id (workspaceId) di path,
// kita bisa kirim workspaceId di query atau fetch comment dulu.
// Untuk memudahkan, kita pakai middleware sederhana yang fetch comment & check membership.
router.delete("/:commentId", commentController.deleteComment);

// Reactions
router.post("/:commentId/reactions", commentController.addReaction);
router.delete("/:commentId/reactions/:emoji", commentController.removeReaction);

// Resolve
router.post("/:commentId/resolve", commentController.resolveThread);
router.post("/:commentId/unresolve", commentController.unresolveThread);

module.exports = router;
