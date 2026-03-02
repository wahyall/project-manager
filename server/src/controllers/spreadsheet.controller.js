const mongoose = require("mongoose");
const SpreadsheetSheet = require("../models/SpreadsheetSheet");
const SpreadsheetRow = require("../models/SpreadsheetRow");
const SpreadsheetRowGroup = require("../models/SpreadsheetRowGroup");
const Event = require("../models/Event");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// Helper: get Socket.io instance (safe)
const getIO = () => {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
};

// Helper: emit to sheet room
const emitSheetEvent = (sheetId, event, data) => {
  const io = getIO();
  if (io) {
    io.to(`sheet:${sheetId}`).emit(event, data);
  }
};

// Helper: verify event belongs to workspace
const verifyEvent = async (eventId, workspaceId) => {
  const event = await Event.findOne({ _id: eventId, workspaceId });
  return event;
};

// ════════════════════════════════════════════════
// SHEET CRUD
// ════════════════════════════════════════════════

// GET /sheets — Daftar sheet
exports.listSheets = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sheets = await SpreadsheetSheet.find({ eventId })
    .sort({ order: 1 })
    .lean();

  res.status(200).json({
    status: "success",
    data: { sheets },
  });
});

// POST /sheets — Buat sheet baru
exports.createSheet = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const { name } = req.body;

  // Get next order
  const lastSheet = await SpreadsheetSheet.findOne({ eventId })
    .sort({ order: -1 })
    .select("order");
  const nextOrder = lastSheet ? lastSheet.order + 1 : 0;

  const sheet = await SpreadsheetSheet.create({
    eventId,
    name: name?.trim() || `Sheet ${nextOrder + 1}`,
    order: nextOrder,
    columns: [
      { name: "Kolom 1", type: "text", order: 0, width: 200 },
    ],
  });

  // Create one empty row
  await SpreadsheetRow.create({
    sheetId: sheet._id,
    order: 0,
    cells: {},
  });

  const sheetData = sheet.toObject();

  // Emit to workspace (all users viewing this event)
  emitSheetEvent(eventId.toString(), "sheet:created", {
    sheet: sheetData,
    userId,
  });

  res.status(201).json({
    status: "success",
    data: { sheet: sheetData },
  });
});

// PUT /sheets/:sheetId — Update sheet (rename)
exports.updateSheet = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sheet = await SpreadsheetSheet.findOne({
    _id: sheetId,
    eventId,
  });
  if (!sheet) return next(new AppError("Sheet tidak ditemukan", 404));

  const { name } = req.body;
  if (name !== undefined) {
    if (!name.trim()) {
      return next(new AppError("Nama sheet tidak boleh kosong", 400));
    }
    sheet.name = name.trim();
  }

  await sheet.save();
  const sheetData = sheet.toObject();

  emitSheetEvent(sheetId, "sheet:updated", {
    sheet: sheetData,
    userId,
  });

  res.status(200).json({
    status: "success",
    data: { sheet: sheetData },
  });
});

// DELETE /sheets/:sheetId — Hapus sheet
exports.deleteSheet = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  // Check it's not the last sheet
  const sheetCount = await SpreadsheetSheet.countDocuments({ eventId });
  if (sheetCount <= 1) {
    return next(new AppError("Tidak bisa menghapus sheet terakhir", 400));
  }

  const sheet = await SpreadsheetSheet.findOne({
    _id: sheetId,
    eventId,
  });
  if (!sheet) return next(new AppError("Sheet tidak ditemukan", 404));

  // Delete all rows and groups in this sheet
  await Promise.all([
    SpreadsheetRow.deleteMany({ sheetId }),
    SpreadsheetRowGroup.deleteMany({ sheetId }),
    sheet.deleteOne(),
  ]);

  emitSheetEvent(eventId.toString(), "sheet:deleted", {
    sheetId,
    userId,
  });

  res.status(200).json({
    status: "success",
    message: "Sheet berhasil dihapus",
  });
});

// POST /sheets/:sheetId/duplicate — Duplikasi sheet
exports.duplicateSheet = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sourceSheet = await SpreadsheetSheet.findOne({
    _id: sheetId,
    eventId,
  }).lean();
  if (!sourceSheet) return next(new AppError("Sheet tidak ditemukan", 404));

  // Get next order
  const lastSheet = await SpreadsheetSheet.findOne({ eventId })
    .sort({ order: -1 })
    .select("order");
  const nextOrder = lastSheet ? lastSheet.order + 1 : 0;

  // Create column ID mapping (old → new)
  const columnIdMap = {};
  const newColumns = sourceSheet.columns.map((col) => {
    const newCol = { ...col };
    delete newCol._id;
    const newId = new mongoose.Types.ObjectId();
    columnIdMap[col._id.toString()] = newId.toString();
    newCol._id = newId;
    return newCol;
  });

  // Create new sheet
  const newSheet = await SpreadsheetSheet.create({
    eventId,
    name: `${sourceSheet.name} (Copy)`,
    order: nextOrder,
    columns: newColumns,
  });

  // Copy rows
  const sourceRows = await SpreadsheetRow.find({
    sheetId: sourceSheet._id,
  })
    .sort({ order: 1 })
    .lean();

  // Copy groups
  const sourceGroups = await SpreadsheetRowGroup.find({
    sheetId: sourceSheet._id,
  }).lean();

  const groupIdMap = {};
  if (sourceGroups.length > 0) {
    const newGroups = sourceGroups.map((g) => {
      const newGroupId = new mongoose.Types.ObjectId();
      groupIdMap[g._id.toString()] = newGroupId;
      return {
        _id: newGroupId,
        sheetId: newSheet._id,
        name: g.name,
        parentGroupId: null, // Will be re-mapped below
        isCollapsed: g.isCollapsed,
        order: g.order,
      };
    });

    // Re-map parent groups
    newGroups.forEach((g, i) => {
      const sourceGroup = sourceGroups[i];
      if (sourceGroup.parentGroupId) {
        g.parentGroupId =
          groupIdMap[sourceGroup.parentGroupId.toString()] || null;
      }
    });

    await SpreadsheetRowGroup.insertMany(newGroups);
  }

  if (sourceRows.length > 0) {
    const newRows = sourceRows.map((row) => {
      // Remap cell keys (column IDs)
      const newCells = {};
      if (row.cells) {
        const cellEntries =
          row.cells instanceof Map
            ? Array.from(row.cells.entries())
            : Object.entries(row.cells);
        for (const [oldColId, value] of cellEntries) {
          const newColId = columnIdMap[oldColId] || oldColId;
          newCells[newColId] = value;
        }
      }

      return {
        sheetId: newSheet._id,
        order: row.order,
        groupId: row.groupId
          ? groupIdMap[row.groupId.toString()] || null
          : null,
        cells: newCells,
      };
    });

    await SpreadsheetRow.insertMany(newRows);
  }

  const sheetData = newSheet.toObject();

  emitSheetEvent(eventId.toString(), "sheet:created", {
    sheet: sheetData,
    userId,
  });

  res.status(201).json({
    status: "success",
    data: { sheet: sheetData },
  });
});

// PUT /sheets/reorder — Reorder sheets
exports.reorderSheets = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const { sheetOrders } = req.body;
  // sheetOrders: [{ sheetId: "...", order: 0 }, ...]

  if (!Array.isArray(sheetOrders) || sheetOrders.length === 0) {
    return next(new AppError("Data reorder harus berupa array", 400));
  }

  const bulkOps = sheetOrders.map(({ sheetId, order }) => ({
    updateOne: {
      filter: { _id: sheetId, eventId },
      update: { $set: { order } },
    },
  }));

  await SpreadsheetSheet.bulkWrite(bulkOps);

  const sheets = await SpreadsheetSheet.find({ eventId })
    .sort({ order: 1 })
    .lean();

  emitSheetEvent(eventId.toString(), "sheet:reordered", {
    sheets,
    userId,
  });

  res.status(200).json({
    status: "success",
    data: { sheets },
  });
});

// ════════════════════════════════════════════════
// SHEET DATA (rows + groups)
// ════════════════════════════════════════════════

// GET /sheets/all-data — Get ALL sheets with their rows in one request
exports.getAllSheetsWithData = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sheets = await SpreadsheetSheet.find({ eventId })
    .sort({ order: 1 })
    .lean();

  const sheetsData = await Promise.all(
    sheets.map(async (sheet) => {
      const [rows, groups] = await Promise.all([
        SpreadsheetRow.find({ sheetId: sheet._id }).sort({ order: 1 }).lean(),
        SpreadsheetRowGroup.find({ sheetId: sheet._id })
          .sort({ order: 1 })
          .lean(),
      ]);
      return { sheet, rows, groups };
    }),
  );

  res.status(200).json({
    status: "success",
    data: { sheets: sheetsData },
  });
});

// GET /sheets/:sheetId/data — Ambil semua data sheet
exports.getSheetData = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sheet = await SpreadsheetSheet.findOne({
    _id: sheetId,
    eventId,
  }).lean();
  if (!sheet) return next(new AppError("Sheet tidak ditemukan", 404));

  const [rows, groups] = await Promise.all([
    SpreadsheetRow.find({ sheetId }).sort({ order: 1 }).lean(),
    SpreadsheetRowGroup.find({ sheetId }).sort({ order: 1 }).lean(),
  ]);

  res.status(200).json({
    status: "success",
    data: { sheet, rows, groups },
  });
});

// ════════════════════════════════════════════════
// COLUMN CRUD
// ════════════════════════════════════════════════

// POST /sheets/:sheetId/columns — Tambah kolom
exports.addColumn = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sheet = await SpreadsheetSheet.findOne({ _id: sheetId, eventId });
  if (!sheet) return next(new AppError("Sheet tidak ditemukan", 404));

  const {
    name,
    type = "text",
    width = 150,
    options,
    numberFormat,
  } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError("Nama kolom harus diisi", 400));
  }

  // Next order
  const maxOrder = sheet.columns.reduce(
    (max, col) => Math.max(max, col.order),
    -1,
  );

  const newColumn = {
    name: name.trim(),
    type,
    order: maxOrder + 1,
    width,
    options: type === "dropdown" ? options || [] : undefined,
    numberFormat: type === "number" ? numberFormat || "plain" : undefined,
  };

  sheet.columns.push(newColumn);
  await sheet.save();

  const addedColumn = sheet.columns[sheet.columns.length - 1].toObject();

  emitSheetEvent(sheetId, "sheet:column:added", {
    sheetId,
    column: addedColumn,
    userId,
  });

  res.status(201).json({
    status: "success",
    data: { column: addedColumn },
  });
});

// PUT /sheets/:sheetId/columns/:colId — Update kolom
exports.updateColumn = catchAsync(async (req, res, next) => {
  const { eventId, sheetId, colId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sheet = await SpreadsheetSheet.findOne({ _id: sheetId, eventId });
  if (!sheet) return next(new AppError("Sheet tidak ditemukan", 404));

  const column = sheet.columns.id(colId);
  if (!column) return next(new AppError("Kolom tidak ditemukan", 404));

  const { name, type, width, options, numberFormat, formula, isFrozen } =
    req.body;

  if (name !== undefined) {
    if (!name.trim()) {
      return next(new AppError("Nama kolom tidak boleh kosong", 400));
    }
    column.name = name.trim();
  }

  if (type !== undefined) column.type = type;
  if (width !== undefined) column.width = width;
  if (options !== undefined) column.options = options;
  if (numberFormat !== undefined) column.numberFormat = numberFormat;
  if (formula !== undefined) column.formula = formula;
  if (isFrozen !== undefined) column.isFrozen = isFrozen;

  await sheet.save();

  const updatedColumn = column.toObject();

  emitSheetEvent(sheetId, "sheet:column:updated", {
    sheetId,
    columnId: colId,
    column: updatedColumn,
    userId,
  });

  res.status(200).json({
    status: "success",
    data: { column: updatedColumn },
  });
});

// DELETE /sheets/:sheetId/columns/:colId — Hapus kolom
exports.deleteColumn = catchAsync(async (req, res, next) => {
  const { eventId, sheetId, colId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sheet = await SpreadsheetSheet.findOne({ _id: sheetId, eventId });
  if (!sheet) return next(new AppError("Sheet tidak ditemukan", 404));

  const column = sheet.columns.id(colId);
  if (!column) return next(new AppError("Kolom tidak ditemukan", 404));

  // Remove column from sheet
  sheet.columns.pull(colId);
  await sheet.save();

  // Remove cell data for this column from all rows
  await SpreadsheetRow.updateMany(
    { sheetId },
    { $unset: { [`cells.${colId}`]: "" } },
  );

  emitSheetEvent(sheetId, "sheet:column:deleted", {
    sheetId,
    columnId: colId,
    userId,
  });

  res.status(200).json({
    status: "success",
    message: "Kolom berhasil dihapus",
  });
});

// PUT /sheets/:sheetId/columns/reorder — Reorder kolom
exports.reorderColumns = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sheet = await SpreadsheetSheet.findOne({ _id: sheetId, eventId });
  if (!sheet) return next(new AppError("Sheet tidak ditemukan", 404));

  const { columnOrders } = req.body;
  // columnOrders: [{ columnId: "...", order: 0 }, ...]

  if (!Array.isArray(columnOrders)) {
    return next(new AppError("Data reorder harus berupa array", 400));
  }

  columnOrders.forEach(({ columnId, order }) => {
    const col = sheet.columns.id(columnId);
    if (col) col.order = order;
  });

  await sheet.save();

  const sortedColumns = sheet.columns
    .map((c) => c.toObject())
    .sort((a, b) => a.order - b.order);

  emitSheetEvent(sheetId, "sheet:column:reordered", {
    sheetId,
    columnOrders: sortedColumns,
    userId,
  });

  res.status(200).json({
    status: "success",
    data: { columns: sortedColumns },
  });
});

// ════════════════════════════════════════════════
// ROW CRUD
// ════════════════════════════════════════════════

// POST /sheets/:sheetId/rows — Tambah baris
exports.addRow = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sheet = await SpreadsheetSheet.findOne({
    _id: sheetId,
    eventId,
  }).lean();
  if (!sheet) return next(new AppError("Sheet tidak ditemukan", 404));

  const { cells = {}, groupId = null, insertAfterOrder } = req.body;

  let order;
  if (insertAfterOrder !== undefined) {
    // Insert after a specific row — shift subsequent rows
    order = insertAfterOrder + 1;
    await SpreadsheetRow.updateMany(
      { sheetId, order: { $gte: order } },
      { $inc: { order: 1 } },
    );
  } else {
    // Add to end
    const lastRow = await SpreadsheetRow.findOne({ sheetId })
      .sort({ order: -1 })
      .select("order");
    order = lastRow ? lastRow.order + 1 : 0;
  }

  const row = await SpreadsheetRow.create({
    sheetId,
    order,
    groupId,
    cells,
  });

  const rowData = row.toObject();

  emitSheetEvent(sheetId, "sheet:row:added", {
    sheetId,
    row: rowData,
    userId,
  });

  res.status(201).json({
    status: "success",
    data: { row: rowData },
  });
});

// PUT /sheets/:sheetId/rows/:rowId — Update cell data
exports.updateRow = catchAsync(async (req, res, next) => {
  const { eventId, sheetId, rowId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const row = await SpreadsheetRow.findOne({ _id: rowId, sheetId });
  if (!row) return next(new AppError("Baris tidak ditemukan", 404));

  const { cells, groupId } = req.body;

  // Update individual cells (merge, don't replace)
  if (cells) {
    for (const [columnId, value] of Object.entries(cells)) {
      if (value === null || value === undefined) {
        row.cells.delete(columnId);
      } else {
        row.cells.set(columnId, value);
      }
    }
  }

  if (groupId !== undefined) {
    row.groupId = groupId;
  }

  await row.save();

  const rowData = row.toObject();

  // Emit per-cell updates for real-time sync
  if (cells) {
    for (const [columnId, value] of Object.entries(cells)) {
      emitSheetEvent(sheetId, "sheet:cell:updated", {
        sheetId,
        rowId,
        columnId,
        value,
        userId,
      });
    }
  }

  res.status(200).json({
    status: "success",
    data: { row: rowData },
  });
});

// DELETE /sheets/:sheetId/rows/:rowId — Hapus baris
exports.deleteRow = catchAsync(async (req, res, next) => {
  const { eventId, sheetId, rowId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const row = await SpreadsheetRow.findOne({ _id: rowId, sheetId });
  if (!row) return next(new AppError("Baris tidak ditemukan", 404));

  await row.deleteOne();

  emitSheetEvent(sheetId, "sheet:row:deleted", {
    sheetId,
    rowId,
    userId,
  });

  res.status(200).json({
    status: "success",
    message: "Baris berhasil dihapus",
  });
});

// PUT /sheets/:sheetId/rows/batch — Batch update (paste)
exports.batchUpdateRows = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sheet = await SpreadsheetSheet.findOne({
    _id: sheetId,
    eventId,
  }).lean();
  if (!sheet) return next(new AppError("Sheet tidak ditemukan", 404));

  const { updates } = req.body;
  // updates: [{ rowId: "...", cells: { colId: value } }, ...]
  // For new rows: [{ cells: { colId: value }, order: n }, ...]

  if (!Array.isArray(updates) || updates.length === 0) {
    return next(new AppError("Data batch update harus berupa array", 400));
  }

  const results = [];

  for (const update of updates) {
    if (update.rowId) {
      // Update existing row
      const row = await SpreadsheetRow.findOne({
        _id: update.rowId,
        sheetId,
      });
      if (row && update.cells) {
        for (const [columnId, value] of Object.entries(update.cells)) {
          if (value === null || value === undefined) {
            row.cells.delete(columnId);
          } else {
            row.cells.set(columnId, value);
          }
        }
        await row.save();
        results.push(row.toObject());
      }
    } else {
      // Create new row
      const lastRow = await SpreadsheetRow.findOne({ sheetId })
        .sort({ order: -1 })
        .select("order");
      const order = lastRow ? lastRow.order + 1 : 0;

      const newRow = await SpreadsheetRow.create({
        sheetId,
        order: update.order !== undefined ? update.order : order,
        cells: update.cells || {},
      });
      results.push(newRow.toObject());
    }
  }

  emitSheetEvent(sheetId, "sheet:rows:batch:updated", {
    sheetId,
    rows: results,
    userId,
  });

  res.status(200).json({
    status: "success",
    data: { rows: results },
  });
});

// DELETE /sheets/:sheetId/rows/batch — Batch delete rows
exports.batchDeleteRows = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const { rowIds } = req.body;

  if (!Array.isArray(rowIds) || rowIds.length === 0) {
    return next(new AppError("rowIds harus berupa array", 400));
  }

  await SpreadsheetRow.deleteMany({ _id: { $in: rowIds }, sheetId });

  emitSheetEvent(sheetId, "sheet:rows:batch:deleted", {
    sheetId,
    rowIds,
    userId,
  });

  res.status(200).json({
    status: "success",
    message: `${rowIds.length} baris berhasil dihapus`,
  });
});

// ════════════════════════════════════════════════
// ROW GROUP CRUD
// ════════════════════════════════════════════════

// POST /sheets/:sheetId/groups — Buat group
exports.createGroup = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const { name, parentGroupId = null, rowIds = [] } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError("Nama grup harus diisi", 400));
  }

  // Validate nesting depth (max 1 level)
  if (parentGroupId) {
    const parentGroup = await SpreadsheetRowGroup.findById(parentGroupId);
    if (!parentGroup) {
      return next(new AppError("Parent group tidak ditemukan", 404));
    }
    if (parentGroup.parentGroupId) {
      return next(
        new AppError("Grup hanya bisa nested 1 level", 400),
      );
    }
  }

  // Get next order
  const lastGroup = await SpreadsheetRowGroup.findOne({ sheetId })
    .sort({ order: -1 })
    .select("order");
  const nextOrder = lastGroup ? lastGroup.order + 1 : 0;

  const group = await SpreadsheetRowGroup.create({
    sheetId,
    name: name.trim(),
    parentGroupId,
    order: nextOrder,
  });

  // Assign rows to this group
  if (rowIds.length > 0) {
    await SpreadsheetRow.updateMany(
      { _id: { $in: rowIds }, sheetId },
      { $set: { groupId: group._id } },
    );
  }

  const groupData = group.toObject();

  emitSheetEvent(sheetId, "sheet:group:created", {
    sheetId,
    group: groupData,
    userId,
  });

  res.status(201).json({
    status: "success",
    data: { group: groupData },
  });
});

// PUT /sheets/:sheetId/groups/:groupId — Update group
exports.updateGroup = catchAsync(async (req, res, next) => {
  const { eventId, sheetId, groupId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const group = await SpreadsheetRowGroup.findOne({
    _id: groupId,
    sheetId,
  });
  if (!group) return next(new AppError("Grup tidak ditemukan", 404));

  const { name, isCollapsed } = req.body;

  if (name !== undefined) {
    if (!name.trim()) {
      return next(new AppError("Nama grup tidak boleh kosong", 400));
    }
    group.name = name.trim();
  }

  if (isCollapsed !== undefined) {
    group.isCollapsed = isCollapsed;
  }

  await group.save();

  const groupData = group.toObject();

  emitSheetEvent(sheetId, "sheet:group:updated", {
    sheetId,
    group: groupData,
    userId,
  });

  res.status(200).json({
    status: "success",
    data: { group: groupData },
  });
});

// DELETE /sheets/:sheetId/groups/:groupId — Hapus group
exports.deleteGroup = catchAsync(async (req, res, next) => {
  const { eventId, sheetId, groupId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const group = await SpreadsheetRowGroup.findOne({
    _id: groupId,
    sheetId,
  });
  if (!group) return next(new AppError("Grup tidak ditemukan", 404));

  // Ungroup all rows in this group
  await SpreadsheetRow.updateMany(
    { sheetId, groupId: group._id },
    { $set: { groupId: null } },
  );

  // Remove child groups if any
  await SpreadsheetRowGroup.deleteMany({
    sheetId,
    parentGroupId: group._id,
  });

  await group.deleteOne();

  emitSheetEvent(sheetId, "sheet:group:deleted", {
    sheetId,
    groupId,
    userId,
  });

  res.status(200).json({
    status: "success",
    message: "Grup berhasil dihapus",
  });
});

// ════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════

// GET /sheets/:sheetId/export/csv — Export CSV
exports.exportCSV = catchAsync(async (req, res, next) => {
  const { eventId, sheetId } = req.params;
  const workspace = req.workspace;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  const sheet = await SpreadsheetSheet.findOne({
    _id: sheetId,
    eventId,
  }).lean();
  if (!sheet) return next(new AppError("Sheet tidak ditemukan", 404));

  const rows = await SpreadsheetRow.find({ sheetId })
    .sort({ order: 1 })
    .lean();

  // Sort columns by order
  const columns = [...sheet.columns].sort((a, b) => a.order - b.order);

  // Build CSV
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Header row
  const header = columns.map((col) => escapeCSV(col.name)).join(",");

  // Data rows
  const dataRows = rows.map((row) => {
    return columns
      .map((col) => {
        const cellValue = row.cells
          ? row.cells instanceof Map
            ? row.cells.get(col._id.toString())
            : row.cells[col._id.toString()]
          : undefined;
        return escapeCSV(cellValue);
      })
      .join(",");
  });

  const csv = [header, ...dataRows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(sheet.name)}.csv"`,
  );
  res.status(200).send("\uFEFF" + csv); // BOM for Excel compatibility
});

// GET /sheets/export/xlsx — Export all sheets to Excel
exports.exportXLSX = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;

  const event = await verifyEvent(eventId, workspace._id);
  if (!event) return next(new AppError("Event tidak ditemukan", 404));

  let ExcelJS;
  try {
    ExcelJS = require("exceljs");
  } catch {
    return next(
      new AppError("Export Excel tidak tersedia (exceljs belum terinstall)", 500),
    );
  }

  const sheets = await SpreadsheetSheet.find({ eventId })
    .sort({ order: 1 })
    .lean();

  if (sheets.length === 0) {
    return next(new AppError("Tidak ada sheet untuk diexport", 404));
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Project Manager";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    const columns = [...sheet.columns].sort((a, b) => a.order - b.order);

    // Header
    worksheet.columns = columns.map((col) => ({
      header: col.name,
      key: col._id.toString(),
      width: Math.round(col.width / 8),
    }));

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8E8E8" },
    };

    // Data rows
    const rows = await SpreadsheetRow.find({ sheetId: sheet._id })
      .sort({ order: 1 })
      .lean();

    for (const row of rows) {
      const rowData = {};
      columns.forEach((col) => {
        const cellValue = row.cells
          ? row.cells instanceof Map
            ? row.cells.get(col._id.toString())
            : row.cells[col._id.toString()]
          : undefined;
        rowData[col._id.toString()] = cellValue ?? "";
      });
      worksheet.addRow(rowData);
    }
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(event.title)}_spreadsheet.xlsx"`,
  );

  await workbook.xlsx.write(res);
  res.end();
});

