const express = require("express");
const router = express.Router({ mergeParams: true });
const spreadsheetController = require("../controllers/spreadsheet.controller");
const { workspaceMember } = require("../middlewares/rbac");

// All routes already have auth middleware from parent (event.routes.js)
// RBAC is applied per-route: read = all members, write = owner/admin/member

const canEdit = workspaceMember("owner", "admin", "member");
const canView = workspaceMember();

// ── Sheet CRUD ───────────────────────────────────
router.get("/", canView, spreadsheetController.listSheets);
router.get("/all-data", canView, spreadsheetController.getAllSheetsWithData);

// ── Workbook (FortuneSheet native) ───────────────
router.get("/workbook", canView, spreadsheetController.getWorkbook);
router.put("/workbook", canEdit, spreadsheetController.updateWorkbook);

router.post("/", canEdit, spreadsheetController.createSheet);
router.put("/reorder", canEdit, spreadsheetController.reorderSheets);

router.get("/:sheetId", canView, spreadsheetController.getSheetData);
router.get("/:sheetId/data", canView, spreadsheetController.getSheetData);
router.put("/:sheetId", canEdit, spreadsheetController.updateSheet);
router.delete("/:sheetId", canEdit, spreadsheetController.deleteSheet);
router.post(
  "/:sheetId/duplicate",
  canEdit,
  spreadsheetController.duplicateSheet,
);

// ── Column CRUD ──────────────────────────────────
router.post("/:sheetId/columns", canEdit, spreadsheetController.addColumn);
router.put(
  "/:sheetId/columns/reorder",
  canEdit,
  spreadsheetController.reorderColumns,
);
router.put(
  "/:sheetId/columns/:colId",
  canEdit,
  spreadsheetController.updateColumn,
);
router.delete(
  "/:sheetId/columns/:colId",
  canEdit,
  spreadsheetController.deleteColumn,
);

// ── Row CRUD ─────────────────────────────────────
router.post("/:sheetId/rows", canEdit, spreadsheetController.addRow);
router.put(
  "/:sheetId/rows/batch",
  canEdit,
  spreadsheetController.batchUpdateRows,
);
router.delete(
  "/:sheetId/rows/batch",
  canEdit,
  spreadsheetController.batchDeleteRows,
);
router.put("/:sheetId/rows/:rowId", canEdit, spreadsheetController.updateRow);
router.delete(
  "/:sheetId/rows/:rowId",
  canEdit,
  spreadsheetController.deleteRow,
);

// ── Row Group CRUD ───────────────────────────────
router.post("/:sheetId/groups", canEdit, spreadsheetController.createGroup);
router.put(
  "/:sheetId/groups/:groupId",
  canEdit,
  spreadsheetController.updateGroup,
);
router.delete(
  "/:sheetId/groups/:groupId",
  canEdit,
  spreadsheetController.deleteGroup,
);

// ── Export ────────────────────────────────────────
router.get(
  "/:sheetId/export/csv",
  canView,
  spreadsheetController.exportCSV,
);
router.get("/export/xlsx", canView, spreadsheetController.exportXLSX);

module.exports = router;

