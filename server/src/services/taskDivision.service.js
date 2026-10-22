const mongoose = require("mongoose");
const WorkspaceDivision = require("../models/WorkspaceDivision");
const WorkspaceMember = require("../models/WorkspaceMember");
const AppError = require("../utils/AppError");

const UNRESTRICTED_ROLES = ["owner", "admin"];

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    return (value._id || value.id || value)?.toString?.() || null;
  }
  return value.toString();
};

const uniqueIds = (values = []) => {
  const seen = new Set();
  const ids = [];
  for (const value of values) {
    const id = toIdString(value);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
};

/**
 * Validasi daftar divisi task dan kembalikan dokumen divisi yang dibutuhkan
 * untuk validasi PIC/subtask.
 */
const resolveTaskDivisions = async ({
  workspaceId,
  primaryDivisionId,
  divisionIds,
}) => {
  const primaryId = toIdString(primaryDivisionId);
  const requested = uniqueIds([
    ...(primaryId ? [primaryId] : []),
    ...(Array.isArray(divisionIds) ? divisionIds : []),
  ]);

  if (requested.length === 0) {
    return { divisionId: null, divisionIds: [], divisions: [] };
  }

  const invalid = requested.filter(
    (id) => !mongoose.Types.ObjectId.isValid(id),
  );
  if (invalid.length > 0) {
    throw new AppError("ID divisi tidak valid", 400);
  }

  const divisions = await WorkspaceDivision.find({
    _id: { $in: requested },
    workspaceId,
  })
    .select("_id name color members.userId members.role")
    .lean();

  if (divisions.length !== requested.length) {
    throw new AppError(
      "Ada divisi yang tidak ditemukan di workspace ini",
      400,
    );
  }

  const byId = new Map(
    divisions.map((division) => [division._id.toString(), division]),
  );
  const ordered = requested.map((id) => byId.get(id));
  const resolvedPrimary = primaryId || ordered[0]._id.toString();

  return {
    divisionId: resolvedPrimary,
    divisionIds: ordered.map((division) => division._id),
    divisions: ordered,
  };
};

/**
 * Normalisasi PIC per divisi. Setiap divisi maksimal satu PIC dan PIC wajib
 * anggota divisi tersebut sekaligus anggota workspace.
 */
const normalizeDivisionPics = async ({
  workspaceId,
  divisionPics,
  divisions,
}) => {
  if (!Array.isArray(divisionPics) || divisionPics.length === 0) {
    return [];
  }

  const divisionIds = new Set(divisions.map((d) => d._id.toString()));
  const divisionMap = new Map(
    divisions.map((division) => [division._id.toString(), division]),
  );
  const seenDivisions = new Set();
  const normalized = [];

  for (const pic of divisionPics) {
    const divisionId = toIdString(pic?.divisionId);
    const userId = toIdString(pic?.userId);

    // userId kosong berarti PIC divisi tersebut dikosongkan.
    if (!divisionId || !userId) continue;

    if (!divisionIds.has(divisionId)) {
      throw new AppError(
        "PIC hanya boleh dipilih dari divisi yang terlibat",
        400,
      );
    }
    if (seenDivisions.has(divisionId)) {
      throw new AppError("Setiap divisi hanya boleh memiliki satu PIC", 400);
    }

    const division = divisionMap.get(divisionId);
    const isDivisionMember = (division?.members || []).some(
      (member) => toIdString(member.userId) === userId,
    );
    if (!isDivisionMember) {
      throw new AppError("PIC harus anggota divisi tersebut", 400);
    }

    seenDivisions.add(divisionId);
    normalized.push({ divisionId, userId });
  }

  const userIds = uniqueIds(normalized.map((pic) => pic.userId));
  if (userIds.length > 0) {
    const memberships = await WorkspaceMember.find({
      workspaceId,
      userId: { $in: userIds },
    })
      .select("userId")
      .lean();

    if (memberships.length !== userIds.length) {
      throw new AppError("PIC harus anggota workspace ini", 400);
    }
  }

  return normalized;
};

/**
 * Hanya pembuat task, owner/admin, atau ketua dari divisi yang terlibat yang
 * boleh mengubah daftar divisi/PIC task.
 */
const canManageTaskDivisions = async ({
  workspaceId,
  task,
  userId,
  role,
  nextDivisionIds = [],
}) => {
  if (UNRESTRICTED_ROLES.includes(role)) return true;
  if (task?.createdBy && toIdString(task.createdBy) === userId.toString()) {
    return true;
  }

  const involvedIds = uniqueIds([
    ...(task?.divisionId ? [task.divisionId] : []),
    ...(task?.divisionIds || []),
    ...nextDivisionIds,
  ]);

  if (involvedIds.length === 0) return false;

  const leader = await WorkspaceDivision.findOne({
    _id: { $in: involvedIds },
    workspaceId,
    members: { $elemMatch: { userId, role: "leader" } },
  })
    .select("_id")
    .lean();

  return !!leader;
};

/**
 * Validasi assignee/divisi pada subtask sebelum disimpan.
 */
const validateSubtaskAssignees = async ({
  workspaceId,
  subtasks,
  divisionIds,
  divisions,
}) => {
  const validDivisionIds = new Set(
    (divisionIds || []).map((id) => toIdString(id)),
  );
  const divisionMap = new Map(
    (divisions || []).map((division) => [
      division._id.toString(),
      division,
    ]),
  );
  const userIds = new Set();

  for (const subtask of subtasks || []) {
    const divisionId = toIdString(subtask.divisionId);
    const assigneeId = toIdString(subtask.assignee);

    if (divisionId) {
      if (!validDivisionIds.has(divisionId)) {
        throw new AppError(
          "Divisi subtask harus termasuk divisi yang terlibat",
          400,
        );
      }
      if (assigneeId) {
        const division = divisionMap.get(divisionId);
        const isMember = (division?.members || []).some(
          (member) => toIdString(member.userId) === assigneeId,
        );
        if (!isMember) {
          throw new AppError(
            "PIC subtask harus anggota divisi subtask tersebut",
            400,
          );
        }
      }
    } else if (assigneeId && validDivisionIds.size > 0) {
      // Task berdivisi: PIC tanpa divisi tetap harus berasal dari salah satu
      // divisi yang terlibat agar task tetap dapat diakses oleh PIC tersebut.
      const isInvolvedMember = (divisions || []).some(
        (division) =>
          validDivisionIds.has(division._id.toString()) &&
          (division.members || []).some(
            (member) => toIdString(member.userId) === assigneeId,
          ),
      );
      if (!isInvolvedMember) {
        throw new AppError(
          "PIC subtask harus anggota salah satu divisi yang terlibat",
          400,
        );
      }
    }

    if (assigneeId) userIds.add(assigneeId);
  }

  if (userIds.size > 0) {
    const memberships = await WorkspaceMember.find({
      workspaceId,
      userId: { $in: [...userIds] },
    })
      .select("userId")
      .lean();

    if (memberships.length !== userIds.size) {
      throw new AppError("PIC subtask harus anggota workspace ini", 400);
    }
  }
};

module.exports = {
  toIdString,
  uniqueIds,
  resolveTaskDivisions,
  normalizeDivisionPics,
  canManageTaskDivisions,
  validateSubtaskAssignees,
};
