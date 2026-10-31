const AppError = require("./AppError");

const ADMIN_ROLES = ["owner", "admin"];

const isWorkspaceAdmin = (role) => ADMIN_ROLES.includes(role);

/**
 * Ambil daftar divisionId (string) di mana userId memiliki role "leader"
 */
const getUserLeaderDivisionIds = async (workspaceId, userId) => {
  if (!workspaceId || !userId) return [];
  const WorkspaceDivision = require("../models/WorkspaceDivision");
  const divisions = await WorkspaceDivision.find({
    workspaceId,
    members: { $elemMatch: { userId, role: "leader" } },
  })
    .select("_id")
    .lean();

  return divisions.map((d) => d._id.toString());
};

const toId = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    return (value._id || value.id || value)?.toString?.() || null;
  }
  return value.toString();
};

const getInvolvedDivisionIds = (item = {}) => {
  const ids = [];
  if (item.divisionId) {
    const id = toId(item.divisionId);
    if (id) ids.push(id);
  }
  if (Array.isArray(item.divisionIds)) {
    for (const d of item.divisionIds) {
      const id = toId(d);
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
};

/**
 * Cek apakah payload update task HANYA memodifikasi status / pergerakan kolom
 * atau toggle status isCompleted pada subtask.
 */
const isTaskStatusOnlyPayload = (body = {}) => {
  const keys = Object.keys(body).filter((k) => body[k] !== undefined);
  if (keys.length === 0) return true;

  // Field terlarang untuk member biasa
  const forbiddenKeys = [
    "title",
    "description",
    "assignees",
    "startDate",
    "dueDate",
    "priority",
    "labels",
    "eventId",
    "divisionId",
    "divisionIds",
    "divisionPics",
    "coordination",
    "phase",
    "dueDateMode",
    "dueOffsetDays",
    "blockedBy",
    "isArchived",
    "isDeleted",
  ];

  for (const k of forbiddenKeys) {
    if (keys.includes(k)) return false;
  }

  // Jika menyertakan subtask, controller akan memvalidasi apakah hanya toggle isCompleted
  if (keys.includes("subtasks")) {
    return true;
  }

  return keys.every((k) => ["columnId", "columnOrder"].includes(k));
};

/**
 * Cek apakah payload update event HANYA memodifikasi status
 */
const isEventStatusOnlyPayload = (body = {}) => {
  const keys = Object.keys(body).filter((k) => body[k] !== undefined);
  if (keys.length === 0) return true;

  return keys.length === 1 && keys[0] === "status";
};

/**
 * Evaluasi izin Task
 */
const canManageTaskSync = ({
  role,
  leaderDivisions = [],
  task = {},
  action,
  payload = {},
}) => {
  if (isWorkspaceAdmin(role)) {
    return { allowed: true };
  }

  const involved = getInvolvedDivisionIds(task);
  const isLeaderOfInvolved = involved.some((id) =>
    leaderDivisions.includes(id),
  );

  if (action === "create") {
    const targetDivisionId = toId(task?.divisionId || payload?.divisionId);
    const targetDivisionIds = (task?.divisionIds || payload?.divisionIds || []).map(toId);
    const allTargets = [targetDivisionId, ...targetDivisionIds].filter(Boolean);

    if (allTargets.length === 0) {
      return {
        allowed: false,
        message: "Hanya owner dan admin yang dapat membuat task tanpa divisi",
      };
    }

    const hasLeaderAccess = allTargets.some((id) => leaderDivisions.includes(id));
    if (!hasLeaderAccess) {
      return {
        allowed: false,
        message: "Ketua divisi hanya dapat membuat task untuk divisi yang dipimpinnya",
      };
    }
    return { allowed: true };
  }

  if (action === "update") {
    if (isLeaderOfInvolved) {
      return { allowed: true };
    }
    // Member biasa hanya boleh update status
    if (isTaskStatusOnlyPayload(payload)) {
      return { allowed: true, isStatusOnly: true };
    }
    return {
      allowed: false,
      message: "Member biasa hanya memiliki izin untuk memperbarui status task",
    };
  }

  if (action === "delete" || action === "archive") {
    if (isLeaderOfInvolved) {
      return { allowed: true };
    }
    return {
      allowed: false,
      message: "Hanya owner, admin, atau ketua divisi terkait yang dapat menghapus atau mengarsipkan task",
    };
  }

  return { allowed: false, message: "Aksi tidak diizinkan" };
};

/**
 * Evaluasi izin Event
 */
const canManageEventSync = ({
  role,
  leaderDivisions = [],
  event = {},
  action,
  payload = {},
}) => {
  if (isWorkspaceAdmin(role)) {
    return { allowed: true };
  }

  const eventDivId = toId(event?.divisionId);
  const isLeaderOfEvent = eventDivId && leaderDivisions.includes(eventDivId);

  if (action === "create") {
    const targetDivisionId = toId(event?.divisionId || payload?.divisionId);
    if (!targetDivisionId) {
      return {
        allowed: false,
        message: "Hanya owner dan admin yang dapat membuat event tanpa divisi",
      };
    }
    if (!leaderDivisions.includes(targetDivisionId)) {
      return {
        allowed: false,
        message: "Ketua divisi hanya dapat membuat event untuk divisi yang dipimpinnya",
      };
    }
    return { allowed: true };
  }

  if (action === "update") {
    if (isLeaderOfEvent) {
      return { allowed: true };
    }
    if (isEventStatusOnlyPayload(payload)) {
      return { allowed: true, isStatusOnly: true };
    }
    return {
      allowed: false,
      message: "Member biasa hanya memiliki izin untuk memperbarui status event",
    };
  }

  if (action === "delete") {
    if (isLeaderOfEvent) {
      return { allowed: true };
    }
    return {
      allowed: false,
      message: "Hanya owner, admin, atau ketua divisi terkait yang dapat menghapus event",
    };
  }

  return { allowed: false, message: "Aksi tidak diizinkan" };
};

module.exports = {
  ADMIN_ROLES,
  isWorkspaceAdmin,
  getUserLeaderDivisionIds,
  isTaskStatusOnlyPayload,
  isEventStatusOnlyPayload,
  canManageTaskSync,
  canManageEventSync,
};
