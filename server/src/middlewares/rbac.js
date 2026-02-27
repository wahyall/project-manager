const WorkspaceMember = require("../models/WorkspaceMember");
const Workspace = require("../models/Workspace");
const AppError = require("../utils/AppError");

/**
 * Middleware: Verifikasi user adalah member workspace dengan role tertentu
 *
 * @param  {...string} allowedRoles - Role yang diizinkan (kosong = semua member)
 *
 * Contoh penggunaan:
 *   workspaceMember()                    → semua member bisa akses
 *   workspaceMember("owner", "admin")    → hanya owner dan admin
 *   workspaceMember("owner")             → hanya owner
 */
const workspaceMember = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.id || req.params.workspaceId;
      const userId = req.user.id;

      if (!workspaceId) {
        return next(new AppError("Workspace ID diperlukan", 400));
      }

      // Cek workspace exists
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return next(new AppError("Workspace tidak ditemukan", 404));
      }

      // Cek membership
      const membership = await WorkspaceMember.findMembership(
        workspaceId,
        userId,
      );

      if (!membership) {
        return next(
          new AppError("Kamu bukan member workspace ini", 403),
        );
      }

      // Cek role jika ada batasan
      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        return next(
          new AppError("Kamu tidak memiliki izin untuk aksi ini", 403),
        );
      }

      // Attach ke request untuk dipakai di controller
      req.workspace = workspace;
      req.workspaceMember = membership;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Verifikasi user bisa manage member target
 * Owner bisa manage siapa saja (kecuali diri sendiri untuk remove)
 * Admin bisa manage Member dan Guest
 */
const canManageMember = async (req, res, next) => {
  try {
    const { userId: targetUserId } = req.params;
    const actorMembership = req.workspaceMember;

    if (!targetUserId) {
      return next(new AppError("User ID target diperlukan", 400));
    }

    // Cari membership target
    const targetMembership = await WorkspaceMember.findMembership(
      req.workspace._id,
      targetUserId,
    );

    if (!targetMembership) {
      return next(new AppError("User bukan member workspace ini", 404));
    }

    const actorLevel = WorkspaceMember.getRoleLevel(actorMembership.role);
    const targetLevel = WorkspaceMember.getRoleLevel(targetMembership.role);

    // Admin tidak bisa manage Owner atau sesama Admin
    if (actorMembership.role === "admin" && targetLevel >= actorLevel) {
      return next(
        new AppError("Kamu tidak bisa mengelola user dengan role yang sama atau lebih tinggi", 403),
      );
    }

    req.targetMembership = targetMembership;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { workspaceMember, canManageMember };

