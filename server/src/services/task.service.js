const Task = require("../models/Task");

/**
 * Validasi circular dependency
 * Menggunakan BFS untuk mendeteksi apakah menambahkan blockedBy
 * akan membuat circular dependency
 *
 * @param {string} taskId - Task yang ingin ditambahkan dependency
 * @param {string[]} blockedByIds - Daftar task yang memblokir
 * @returns {Promise<boolean>} true jika ada circular dependency
 */
const hasCircularDependency = async (taskId, blockedByIds) => {
  if (!blockedByIds || blockedByIds.length === 0) return false;

  const taskIdStr = taskId.toString();

  // Jika task memblokir dirinya sendiri
  if (blockedByIds.some((id) => id.toString() === taskIdStr)) {
    return true;
  }

  // BFS: cek apakah ada path dari blockedByIds kembali ke taskId
  const visited = new Set();
  const queue = [...blockedByIds.map((id) => id.toString())];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentTask = await Task.findById(currentId)
      .select("blockedBy")
      .lean();
    if (!currentTask || !currentTask.blockedBy) continue;

    for (const depId of currentTask.blockedBy) {
      const depIdStr = depId.toString();
      if (depIdStr === taskIdStr) {
        return true; // Circular detected!
      }
      if (!visited.has(depIdStr)) {
        queue.push(depIdStr);
      }
    }
  }

  return false;
};

/**
 * Dapatkan ID kolom "Done" dari workspace
 * Mencari kolom dengan nama yang mengandung "done" (case insensitive)
 *
 * @param {Object} workspace - Workspace document
 * @returns {string[]} Array of column IDs
 */
const getDoneColumnIds = (workspace) => {
  if (!workspace.kanbanColumns) return [];

  return workspace.kanbanColumns
    .filter((col) => col.name.toLowerCase().includes("done"))
    .map((col) => col._id);
};

/**
 * Validasi bahwa columnId ada di workspace kanban columns
 *
 * @param {Object} workspace - Workspace document
 * @param {string} columnId - Column ID to validate
 * @returns {boolean}
 */
const isValidColumn = (workspace, columnId) => {
  if (!workspace.kanbanColumns) return false;
  return workspace.kanbanColumns.some(
    (col) => col._id.toString() === columnId.toString(),
  );
};

/**
 * Hitung order berikutnya untuk task baru di kolom tertentu
 *
 * @param {string} workspaceId
 * @param {string} columnId
 * @returns {Promise<number>}
 */
const getNextColumnOrder = async (workspaceId, columnId) => {
  const lastTask = await Task.findOne({
    workspaceId,
    columnId,
    isDeleted: false,
  })
    .sort({ columnOrder: -1 })
    .select("columnOrder")
    .lean();

  return lastTask ? lastTask.columnOrder + 1 : 0;
};

module.exports = {
  hasCircularDependency,
  getDoneColumnIds,
  isValidColumn,
  getNextColumnOrder,
};
