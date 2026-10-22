const mongoose = require("mongoose");
const WorkspaceDivision = require("../models/WorkspaceDivision");
const AppError = require("./AppError");

// Role yang boleh melihat semua divisi
const UNRESTRICTED_ROLES = ["owner", "admin"];

const isUnrestricted = (role) => UNRESTRICTED_ROLES.includes(role);

const parseDivisionParam = (divisionParam) => {
  if (
    divisionParam === undefined ||
    divisionParam === null ||
    divisionParam === ""
  ) {
    return undefined;
  }
  const parts = String(divisionParam)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
};

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

const buildTaskDivisionClause = (ids, includeNone) => {
  const clauses = [];

  if (ids.length > 0) {
    // Task lama hanya punya divisionId; task baru selalu punya divisionIds.
    clauses.push({ divisionId: { $in: ids } });
    clauses.push({ divisionIds: { $in: ids } });
  }

  if (includeNone) {
    clauses.push({ divisionId: null, divisionIds: { $size: 0 } });
    clauses.push({ divisionId: null, divisionIds: { $exists: false } });
  }

  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0];
  return { $or: clauses };
};

/**
 * Scope divisi untuk task multi-divisi.
 *
 * Berbeda dari applyDivisionScope yang hanya memfilter `divisionId`, helper ini
 * mencocokkan `divisionId` lama maupun `divisionIds` baru. Hasilnya berupa
 * clause Mongo agar bisa digabung dengan filter lain memakai `$and`.
 */
const buildTaskDivisionScope = async ({
  workspaceId,
  userId,
  role,
  divisionParam,
}) => {
  const requested = parseDivisionParam(divisionParam);

  if (isUnrestricted(role)) {
    if (requested === undefined) return null;
    const includeNone = requested.includes("none");
    const ids = requested.filter((value) => value !== "none");
    for (const id of ids) {
      await resolveDivisionId(id, workspaceId);
    }
    return buildTaskDivisionClause(ids, includeNone);
  }

  const allowedIds = await getUserDivisionIds(workspaceId, userId);

  if (requested === undefined) {
    return buildTaskDivisionClause(allowedIds, true);
  }

  const includeNone = requested.includes("none");
  const ids = requested.filter((value) => value !== "none");
  for (const id of ids) {
    if (!allowedIds.includes(id)) {
      throw new AppError("Kamu tidak memiliki akses ke divisi ini", 403);
    }
  }
  return buildTaskDivisionClause(ids, includeNone);
};

const applyTaskDivisionScope = async ({
  filter,
  workspaceId,
  userId,
  role,
  divisionParam,
}) => {
  const clause = await buildTaskDivisionScope({
    workspaceId,
    userId,
    role,
    divisionParam,
  });
  if (clause) {
    filter.$and = [...(filter.$and || []), clause];
  }
  return filter;
};

/**
 * Cek akses detail task multi-divisi.
 * - owner/admin: selalu boleh.
 * - Tanpa Divisi: semua member workspace boleh.
 * - Multi-divisi: member salah satu divisi terkait boleh.
 */
const canViewTask = async ({ task, workspaceId, userId, role }) => {
  if (isUnrestricted(role)) return true;
  if (!task) return false;

  const toId = (value) => {
    if (!value) return null;
    return (value._id || value).toString();
  };

  const involvedIds = [
    ...(task.divisionId ? [toId(task.divisionId)] : []),
    ...(task.divisionIds || []).map(toId),
  ].filter(Boolean);
  const uniqueInvolvedIds = [...new Set(involvedIds)];

  if (uniqueInvolvedIds.length === 0) return true;

  const allowedIds = await getUserDivisionIds(workspaceId, userId);
  return uniqueInvolvedIds.some((id) => allowedIds.includes(id));
};

const assertCanViewTask = async (args) => {
  const ok = await canViewTask(args);
  if (!ok) {
    throw new AppError("Kamu tidak memiliki akses ke task ini", 403);
  }
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
  buildTaskDivisionScope,
  applyTaskDivisionScope,
  canViewTask,
  assertCanViewTask,
  canViewDivisionItem,
  assertCanViewDivisionItem,
};
