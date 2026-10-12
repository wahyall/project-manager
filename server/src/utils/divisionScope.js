const mongoose = require("mongoose");
const WorkspaceDivision = require("../models/WorkspaceDivision");
const AppError = require("./AppError");

// Role yang boleh melihat semua divisi
const UNRESTRICTED_ROLES = ["owner", "admin"];

const isUnrestricted = (role) => UNRESTRICTED_ROLES.includes(role);

/**
 * Ambil daftar divisionId (string) yang diikuti user di workspace ini.
 */
const getUserDivisionIds = async (workspaceId, userId) => {
  const divisions = await WorkspaceDivision.find({
    workspaceId,
    "members.userId": userId,
  })
    .select("_id")
    .lean();
  return divisions.map((d) => d._id.toString());
};

/**
 * Validasi divisionId milik workspace ini.
 * @returns ObjectId|null — null berarti "Tanpa Divisi".
 * @throws AppError jika id tidak valid / bukan milik workspace.
 */
const resolveDivisionId = async (divisionId, workspaceId) => {
  if (divisionId === undefined || divisionId === null || divisionId === "") {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(divisionId)) {
    throw new AppError("ID divisi tidak valid", 400);
  }
  const division = await WorkspaceDivision.findOne({
    _id: divisionId,
    workspaceId,
  })
    .select("_id")
    .lean();
  if (!division) {
    throw new AppError("Divisi tidak ditemukan di workspace ini", 400);
  }
  return division._id;
};

/**
 * Terapkan scope divisi ke filter list.
 *
 * Query param `divisionId`: id divisi | "none" (Tanpa Divisi) |
 * comma-separated ids | undefined (default).
 *
 * - owner/admin: default = semua; param mempersempit.
 * - member/guest (dikunci): default = divisinya + Tanpa Divisi;
 *   param hanya boleh subset dari itu, selain itu 403.
 *
 * @returns {Object} { divisionIds: string[]|null } — null = milik user (atau semua utk unrestricted tanpa param)
 *   Sebenarnya fungsi ini langsung memutasi `filter`.
 */
const applyDivisionScope = async ({
  filter,
  workspaceId,
  userId,
  role,
  divisionParam,
}) => {
  const parseParam = () => {
    if (divisionParam === undefined || divisionParam === null || divisionParam === "") {
      return undefined;
    }
    const parts = String(divisionParam)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts;
  };

  const requested = parseParam();

  if (isUnrestricted(role)) {
    if (requested === undefined) return filter;
    // "none" saja → hanya Tanpa Divisi
    if (requested.length === 1 && requested[0] === "none") {
      filter.divisionId = null;
      return filter;
    }
    const ids = requested.filter((v) => v !== "none");
    const includeNone = requested.includes("none");
    for (const id of ids) {
      await resolveDivisionId(id, workspaceId);
    }
    filter.divisionId = includeNone ? { $in: [...ids, null] } : { $in: ids };
    return filter;
  }

  // ── Member/guest: dikunci ke divisinya + Tanpa Divisi ──
  const allowedIds = await getUserDivisionIds(workspaceId, userId);

  if (requested === undefined) {
    filter.divisionId = { $in: [...allowedIds, null] };
    return filter;
  }

  const includeNone = requested.includes("none");
  const ids = requested.filter((v) => v !== "none");
  for (const id of ids) {
    if (!allowedIds.includes(id)) {
      throw new AppError("Kamu tidak memiliki akses ke divisi ini", 403);
    }
  }
  if (ids.length === 0) {
    filter.divisionId = null;
  } else {
    filter.divisionId = includeNone ? { $in: [...ids, null] } : { $in: ids };
  }
  return filter;
};

/**
 * Cek apakah user boleh melihat item (event/task) ber-divisionId tertentu.
 * - owner/admin: selalu boleh.
 * - Tanpa Divisi (null): boleh untuk semua member.
 * - Berdivisi: member harus anggota divisi itu.
 */
const canViewDivisionItem = async ({ divisionId, workspaceId, userId, role }) => {
  if (isUnrestricted(role)) return true;
  if (!divisionId) return true;
  const allowedIds = await getUserDivisionIds(workspaceId, userId);
  return allowedIds.includes(divisionId.toString());
};

const assertCanViewDivisionItem = async (args) => {
  const ok = await canViewDivisionItem(args);
  if (!ok) {
    throw new AppError("Kamu tidak memiliki akses ke divisi ini", 403);
  }
};

module.exports = {
  UNRESTRICTED_ROLES,
  isUnrestricted,
  getUserDivisionIds,
  resolveDivisionId,
  applyDivisionScope,
  canViewDivisionItem,
  assertCanViewDivisionItem,
};
