// client/lib/permissions.js

export const ADMIN_ROLES = ["owner", "admin"];

export const isWorkspaceAdmin = (role) => ADMIN_ROLES.includes(role);

export const getMemberUserId = (m) =>
  (m?.userId?._id || m?.userId)?.toString?.() || String(m?.userId || "");

/**
 * Daftar divisi di mana user memiliki role "leader"
 */
export const getLeaderDivisions = (divisions = [], userId) => {
  if (!userId) return [];
  const uid = userId.toString();
  return divisions.filter((d) =>
    (d.members || []).some(
      (m) => getMemberUserId(m) === uid && m.role === "leader",
    ),
  );
};

export const getLeaderDivisionIds = (divisions = [], userId) =>
  getLeaderDivisions(divisions, userId).map((d) =>
    (d._id?.toString?.() || String(d._id)),
  );

/**
 * Cek apakah user boleh membuat task baru.
 * - Owner & Admin: selalu boleh.
 * - Ketua Divisi: boleh jika memimpin setidaknya 1 divisi.
 * - Member biasa: tidak boleh.
 */
export const canCreateTask = ({ role, divisions = [], userId }) => {
  if (isWorkspaceAdmin(role)) return true;
  const leaders = getLeaderDivisionIds(divisions, userId);
  return leaders.length > 0;
};

/**
 * Cek apakah user boleh mengelola penuh (edit data lengkap / hapus) task tertentu.
 */
export const canManageTask = ({ task, role, divisions = [], userId }) => {
  if (isWorkspaceAdmin(role)) return true;
  if (!task || !userId) return false;

  const leaders = getLeaderDivisionIds(divisions, userId);
  if (leaders.length === 0) return false;

  const toId = (val) => (val?._id || val)?.toString?.() || String(val || "");
  const involved = [
    task.divisionId ? toId(task.divisionId) : null,
    ...(task.divisionIds || []).map(toId),
  ].filter(Boolean);

  return involved.some((id) => leaders.includes(id));
};

/**
 * Cek apakah user boleh membuat event baru.
 */
export const canCreateEvent = ({ role, divisions = [], userId }) => {
  if (isWorkspaceAdmin(role)) return true;
  const leaders = getLeaderDivisionIds(divisions, userId);
  return leaders.length > 0;
};

/**
 * Cek apakah user boleh mengelola penuh (edit data lengkap / hapus) event tertentu.
 */
export const canManageEvent = ({ event, role, divisions = [], userId }) => {
  if (isWorkspaceAdmin(role)) return true;
  if (!event || !userId) return false;

  const leaders = getLeaderDivisionIds(divisions, userId);
  if (leaders.length === 0) return false;

  const eventDivId = (event.divisionId?._id || event.divisionId)?.toString?.();
  if (!eventDivId) return false;

  return leaders.includes(eventDivId);
};
