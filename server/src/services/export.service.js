const path = require("path");
const fs = require("fs");
const Task = require("../models/Task");
const Event = require("../models/Event");
const Workspace = require("../models/Workspace");
const ExportJob = require("../models/ExportJob");

// Ensure exports directory exists
const EXPORTS_DIR = path.join(__dirname, "../../exports");
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

// ════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════

function formatDateStr(date) {
  if (!date) return "";
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatPriority(p) {
  if (!p) return "";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function formatSubtasks(subtasks) {
  if (!subtasks || subtasks.length === 0) return "";
  const done = subtasks.filter((s) => s.isCompleted).length;
  return `${done}/${subtasks.length} selesai`;
}

/**
 * Build MongoDB filter from export params (same logic as task.controller listTasks)
 */
function buildTaskFilter(workspaceId, filters = {}) {
  const filter = { workspaceId, isDeleted: { $ne: true } };

  if (filters.columnId) filter.columnId = filters.columnId;
  if (filters.assignee) filter.assignees = filters.assignee;
  if (filters.priority) filter.priority = filters.priority;
  if (filters.eventId) filter.eventId = filters.eventId;
  if (filters.label) filter.labels = filters.label;
  if (filters.isArchived !== undefined) {
    filter.isArchived =
      filters.isArchived === "true" || filters.isArchived === true;
  } else {
    filter.isArchived = { $ne: true };
  }
  if (filters.keyword) {
    filter.title = { $regex: filters.keyword, $options: "i" };
  }
  if (filters.dueDateFrom || filters.dueDateTo) {
    filter.dueDate = {};
    if (filters.dueDateFrom)
      filter.dueDate.$gte = new Date(filters.dueDateFrom);
    if (filters.dueDateTo) filter.dueDate.$lte = new Date(filters.dueDateTo);
  }

  return filter;
}

/**
 * Fetch tasks with populated fields for export
 */
async function fetchTasksForExport(workspaceId, filters = {}) {
  const filter = buildTaskFilter(workspaceId, filters);

  const tasks = await Task.find(filter)
    .populate("assignees", "name email")
    .populate("labels", "name color")
    .populate("eventId", "title")
    .sort({ columnId: 1, columnOrder: 1, createdAt: -1 })
    .lean();

  // Get workspace for column names
  const workspace = await Workspace.findById(workspaceId).lean();
  const columnMap = {};
  if (workspace?.kanbanColumns) {
    workspace.kanbanColumns.forEach((col) => {
      columnMap[col._id.toString()] = col.name;
    });
  }

  return { tasks, columnMap, workspace };
}

/**
 * Transform task to export row
 */
function taskToRow(task, columnMap) {
  return {
    Judul: task.title || "",
    Status: columnMap[task.columnId?.toString()] || "",
    Assignee: (task.assignees || []).map((a) => a.name).join(", "),
    Prioritas: formatPriority(task.priority),
    "Due Date": formatDateStr(task.dueDate),
    "Start Date": formatDateStr(task.startDate),
    Event: task.eventId?.title || "",
    Label: (task.labels || []).map((l) => l.name).join(", "),
    Subtask: formatSubtasks(task.subtasks),
    Dibuat: formatDateStr(task.createdAt),
  };
}

// ════════════════════════════════════════════════
// EXPORT GENERATORS
// ════════════════════════════════════════════════

/**
 * Generate CSV content for tasks
 */
async function generateTaskCSV(workspaceId, filters = {}) {
  const { tasks, columnMap } = await fetchTasksForExport(workspaceId, filters);

  if (tasks.length === 0) {
    throw new Error("Tidak ada data task untuk di-export");
  }

  const headers = [
    "Judul",
    "Status",
    "Assignee",
    "Prioritas",
    "Due Date",
    "Start Date",
    "Event",
    "Label",
    "Subtask",
    "Dibuat",
  ];

  function escapeCSV(val) {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const rows = tasks.map((task) => {
    const row = taskToRow(task, columnMap);
    return headers.map((h) => escapeCSV(row[h])).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  return { content: "\uFEFF" + csv, count: tasks.length };
}

/**
 * Generate XLSX buffer for tasks
 */
async function generateTaskXLSX(workspaceId, filters = {}) {
  const ExcelJS = require("exceljs");
  const { tasks, columnMap } = await fetchTasksForExport(workspaceId, filters);

  if (tasks.length === 0) {
    throw new Error("Tidak ada data task untuk di-export");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Project Manager";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Tasks");

  const headers = [
    "Judul",
    "Status",
    "Assignee",
    "Prioritas",
    "Due Date",
    "Start Date",
    "Event",
    "Label",
    "Subtask",
    "Dibuat",
  ];

  // Add header row
  worksheet.addRow(headers);
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" }, // Indigo
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // Add data rows
  tasks.forEach((task) => {
    const row = taskToRow(task, columnMap);
    worksheet.addRow(headers.map((h) => row[h]));
  });

  // Auto-width columns
  worksheet.columns.forEach((column, i) => {
    let maxLen = headers[i].length;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value || "").length;
      if (len > maxLen) maxLen = len;
    });
    column.width = Math.min(maxLen + 4, 50);
  });

  // Add borders
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, count: tasks.length };
}

/**
 * Generate Kanban PDF for tasks
 */
async function generateTaskPDF(workspaceId, filters = {}) {
  const PDFDocument = require("pdfkit");
  const { tasks, columnMap, workspace } = await fetchTasksForExport(
    workspaceId,
    filters,
  );

  if (tasks.length === 0) {
    throw new Error("Tidak ada data task untuk di-export");
  }

  // Group tasks by column
  const columns = workspace?.kanbanColumns || [];
  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  const tasksByColumn = {};
  sortedColumns.forEach((col) => {
    tasksByColumn[col._id.toString()] = [];
  });
  tasks.forEach((task) => {
    const colId = task.columnId?.toString();
    if (tasksByColumn[colId]) {
      tasksByColumn[colId].push(task);
    }
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () =>
      resolve({ buffer: Buffer.concat(chunks), count: tasks.length }),
    );
    doc.on("error", reject);

    const pageWidth = doc.page.width - 80; // margins
    const colCount = sortedColumns.length || 1;
    const colWidth = Math.min(180, pageWidth / colCount);
    const gap = 8;

    // Title
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(workspace?.name || "Kanban Board", {
        align: "center",
      });
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#6B7280")
      .text(
        `Exported: ${new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`,
        { align: "center" },
      );
    doc.moveDown(1);

    const startY = doc.y;

    // Draw columns
    sortedColumns.forEach((col, i) => {
      const x = 40 + i * (colWidth + gap);
      const colTasks = tasksByColumn[col._id.toString()] || [];

      // Column header
      doc.save();
      doc.roundedRect(x, startY, colWidth, 24, 4).fill(col.color || "#6B7280");
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#FFFFFF")
        .text(`${col.name} (${colTasks.length})`, x + 8, startY + 6, {
          width: colWidth - 16,
        });
      doc.restore();

      // Task cards
      let cardY = startY + 32;
      colTasks.forEach((task) => {
        if (cardY > doc.page.height - 80) return; // prevent overflow

        const cardHeight = 48;

        // Card background
        doc.save();
        doc.roundedRect(x, cardY, colWidth, cardHeight, 3).fill("#F9FAFB");
        doc.roundedRect(x, cardY, colWidth, cardHeight, 3).stroke("#E5E7EB");

        // Priority indicator
        const priorityColors = {
          critical: "#EF4444",
          high: "#F97316",
          medium: "#EAB308",
          low: "#22C55E",
        };
        doc
          .rect(x, cardY, 3, cardHeight)
          .fill(priorityColors[task.priority] || "#D1D5DB");

        // Title
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor("#111827")
          .text(task.title, x + 8, cardY + 6, {
            width: colWidth - 16,
            height: 20,
            ellipsis: true,
          });

        // Assignee + due date
        const assigneeText = (task.assignees || [])
          .map((a) => a.name)
          .join(", ");
        const dueText = formatDateStr(task.dueDate);
        doc
          .fontSize(6.5)
          .font("Helvetica")
          .fillColor("#6B7280")
          .text(
            [assigneeText, dueText].filter(Boolean).join(" · "),
            x + 8,
            cardY + 28,
            { width: colWidth - 16, height: 14, ellipsis: true },
          );

        doc.restore();
        cardY += cardHeight + 4;
      });
    });

    doc.end();
  });
}

/**
 * Generate Event detail PDF
 */
async function generateEventPDF(eventId, workspaceId) {
  const PDFDocument = require("pdfkit");

  const event = await Event.findOne({
    _id: eventId,
    workspaceId,
    isDeleted: { $ne: true },
  })
    .populate("participants", "name email")
    .populate("createdBy", "name email")
    .lean();

  if (!event) {
    throw new Error("Event tidak ditemukan");
  }

  // Get related tasks
  const tasks = await Task.find({
    eventId,
    workspaceId,
    isDeleted: { $ne: true },
  })
    .populate("assignees", "name email")
    .sort({ createdAt: -1 })
    .lean();

  // Get workspace for column names
  const workspace = await Workspace.findById(workspaceId).lean();
  const columnMap = {};
  if (workspace?.kanbanColumns) {
    workspace.kanbanColumns.forEach((col) => {
      columnMap[col._id.toString()] = col.name;
    });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () =>
      resolve({ buffer: Buffer.concat(chunks), count: tasks.length }),
    );
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100;

    // ── Event Header ──
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#111827")
      .text(event.title);
    doc.moveDown(0.5);

    // Status badge
    const statusLabels = {
      upcoming: "Upcoming",
      ongoing: "Ongoing",
      completed: "Completed",
    };
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#4F46E5")
      .text(`Status: ${statusLabels[event.status] || event.status}`);
    doc.moveDown(0.3);

    // Dates
    doc
      .fontSize(10)
      .fillColor("#374151")
      .text(
        `Tanggal: ${formatDateStr(event.startDate)} — ${formatDateStr(event.endDate)}`,
      );
    doc.moveDown(0.3);

    // Participants
    if (event.participants?.length > 0) {
      doc
        .fontSize(10)
        .fillColor("#374151")
        .text(`Peserta: ${event.participants.map((p) => p.name).join(", ")}`);
      doc.moveDown(0.3);
    }

    // Description
    if (event.description) {
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#6B7280").text(event.description, {
        width: pageWidth,
      });
    }

    // Created by
    doc.moveDown(0.5);
    doc
      .fontSize(8)
      .fillColor("#9CA3AF")
      .text(`Dibuat oleh: ${event.createdBy?.name || "-"}`);
    doc.fontSize(8).text(`Tanggal dibuat: ${formatDateStr(event.createdAt)}`);

    // Divider
    doc.moveDown(1);
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .strokeColor("#E5E7EB")
      .stroke();
    doc.moveDown(1);

    // ── Task Table ──
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#111827")
      .text(`Task Terkait (${tasks.length})`);
    doc.moveDown(0.5);

    if (tasks.length === 0) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#9CA3AF")
        .text("Tidak ada task terkait.");
    } else {
      // Table header
      const tableTop = doc.y;
      const cols = [
        { label: "Judul", width: pageWidth * 0.35, x: 50 },
        { label: "Status", width: pageWidth * 0.15, x: 50 + pageWidth * 0.35 },
        { label: "Assignee", width: pageWidth * 0.2, x: 50 + pageWidth * 0.5 },
        {
          label: "Prioritas",
          width: pageWidth * 0.12,
          x: 50 + pageWidth * 0.7,
        },
        {
          label: "Due Date",
          width: pageWidth * 0.18,
          x: 50 + pageWidth * 0.82,
        },
      ];

      // Header background
      doc.rect(50, tableTop, pageWidth, 20).fill("#F3F4F6");

      cols.forEach((col) => {
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor("#374151")
          .text(col.label, col.x + 4, tableTop + 5, {
            width: col.width - 8,
          });
      });

      // Data rows
      let rowY = tableTop + 22;
      tasks.forEach((task, idx) => {
        if (rowY > doc.page.height - 60) {
          doc.addPage();
          rowY = 40;
        }

        if (idx % 2 === 0) {
          doc.rect(50, rowY, pageWidth, 18).fill("#FAFAFA");
        }

        const rowData = [
          task.title || "",
          columnMap[task.columnId?.toString()] || "",
          (task.assignees || []).map((a) => a.name).join(", "),
          formatPriority(task.priority),
          formatDateStr(task.dueDate),
        ];

        cols.forEach((col, ci) => {
          doc
            .fontSize(7.5)
            .font("Helvetica")
            .fillColor("#374151")
            .text(rowData[ci], col.x + 4, rowY + 4, {
              width: col.width - 8,
              height: 14,
              ellipsis: true,
            });
        });

        rowY += 18;
      });
    }

    // Footer
    doc.moveDown(2);
    doc
      .fontSize(7)
      .fillColor("#9CA3AF")
      .text(
        `Exported: ${new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        { align: "center" },
      );

    doc.end();
  });
}

// ════════════════════════════════════════════════
// JOB RUNNER
// ════════════════════════════════════════════════

/**
 * Run an export job asynchronously
 */
async function runJob(jobId) {
  const job = await ExportJob.findById(jobId);
  if (!job) return;

  try {
    job.status = "processing";
    await job.save();

    let result;
    const { type, workspaceId, params } = job;

    switch (type) {
      case "task_csv": {
        const { content, count } = await generateTaskCSV(
          workspaceId,
          params.filters,
        );
        const fileName = `tasks_${Date.now()}.csv`;
        const filePath = path.join(EXPORTS_DIR, fileName);
        fs.writeFileSync(filePath, content, "utf-8");
        result = {
          fileName,
          filePath,
          fileSize: Buffer.byteLength(content, "utf-8"),
        };
        break;
      }

      case "task_xlsx": {
        const { buffer, count } = await generateTaskXLSX(
          workspaceId,
          params.filters,
        );
        const fileName = `tasks_${Date.now()}.xlsx`;
        const filePath = path.join(EXPORTS_DIR, fileName);
        fs.writeFileSync(filePath, buffer);
        result = { fileName, filePath, fileSize: buffer.length };
        break;
      }

      case "task_pdf": {
        const { buffer } = await generateTaskPDF(workspaceId, params.filters);
        const fileName = `kanban_${Date.now()}.pdf`;
        const filePath = path.join(EXPORTS_DIR, fileName);
        fs.writeFileSync(filePath, buffer);
        result = { fileName, filePath, fileSize: buffer.length };
        break;
      }

      case "event_pdf": {
        const { buffer } = await generateEventPDF(params.targetId, workspaceId);
        const fileName = `event_${Date.now()}.pdf`;
        const filePath = path.join(EXPORTS_DIR, fileName);
        fs.writeFileSync(filePath, buffer);
        result = { fileName, filePath, fileSize: buffer.length };
        break;
      }

      default:
        throw new Error(`Tipe export tidak dikenali: ${type}`);
    }

    job.status = "completed";
    job.fileName = result.fileName;
    job.fileUrl = `/exports/${result.fileName}`;
    job.fileSize = result.fileSize;
    job.completedAt = new Date();
    await job.save();
  } catch (error) {
    job.status = "failed";
    job.error = error.message || "Export gagal";
    await job.save();
  }
}

module.exports = {
  generateTaskCSV,
  generateTaskXLSX,
  generateTaskPDF,
  generateEventPDF,
  runJob,
  EXPORTS_DIR,
};
