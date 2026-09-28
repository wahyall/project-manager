const Task = require("../models/Task");
const Event = require("../models/Event");
const PipelineTemplate = require("../models/PipelineTemplate");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { PHASES, PHASE_LABELS } = require("../utils/pipelinePhases");
const {
  getDoneColumnIds,
  getNextColumnOrder,
  computeDueDateFromOffset,
} = require("../services/task.service");
const taskController = require("./task.controller");
const ActivityLogService = require("../services/activityLog.service");

const getIO = () => {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
};
const emitTaskEvent = (workspaceId, event, data) => {
  const io = getIO();
  if (io) io.to(`workspace:${workspaceId}`).emit(event, data);
};

const populateTask = (query) =>
  query
    .populate("assignees", "name email avatar")
    .populate("watchers", "name email avatar")
    .populate("labels", "name color")
    .populate("createdBy", "name email avatar");

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/events/:eventId/pipeline
// ──────────────────────────────────────────────
exports.listPipeline = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const workspace = req.workspace;

  const event = await Event.findOne({ _id: eventId, workspaceId: workspace._id });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const tasks = await populateTask(
    Task.find({
      eventId,
      phase: { $ne: null },
      isArchived: { $ne: true },
    }),
  ).lean();

  const doneColumnIds = getDoneColumnIds(workspace).map((id) => id.toString());

  const phases = PHASES.map((phase) => {
    const phaseTasks = tasks.filter((t) => t.phase === phase);
    const done = phaseTasks.filter((t) =>
      doneColumnIds.includes(t.columnId?.toString()),
    ).length;
    return {
      phase,
      label: PHASE_LABELS[phase],
      tasks: phaseTasks,
      progress: { done, total: phaseTasks.length },
    };
  });

  res.status(200).json({ status: "success", data: { phases } });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/events/:eventId/pipeline/tasks
// ──────────────────────────────────────────────
exports.createPipelineTask = (req, res, next) => {
  const { eventId } = req.params;
  const { phase } = req.body;

  if (!phase || !PHASES.includes(phase)) {
    return next(
      new AppError(`Fase harus salah satu dari: ${PHASES.join(", ")}`, 400),
    );
  }

  req.body.eventId = eventId;
  return taskController.createTask(req, res, next);
};

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/events/:eventId/pipeline/apply-template
// ──────────────────────────────────────────────
exports.applyTemplate = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const { templateId } = req.body;
  const workspace = req.workspace;
  const userId = req.user.id;

  const event = await Event.findOne({ _id: eventId, workspaceId: workspace._id });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const template = await PipelineTemplate.findOne({
    _id: templateId,
    workspaceId: workspace._id,
  }).lean();
  if (!template) {
    return next(new AppError("Template tidak ditemukan", 404));
  }

  const firstColumnId = workspace.kanbanColumns[0]?._id;
  if (!firstColumnId) {
    return next(new AppError("Workspace belum punya kolom kanban", 400));
  }

  const createdTasks = [];
  for (const item of template.items) {
    const dueDate =
      item.dueDateMode === "relative"
        ? computeDueDateFromOffset(event, item.phase, item.dueOffsetDays)
        : null;
    const columnOrder = await getNextColumnOrder(workspace._id, firstColumnId);
    const task = await Task.create({
      workspaceId: workspace._id,
      title: item.title,
      columnId: firstColumnId,
      columnOrder,
      eventId,
      phase: item.phase,
      dueDateMode: item.dueDateMode,
      dueOffsetDays: item.dueDateMode === "relative" ? item.dueOffsetDays : null,
      dueDate,
      createdBy: userId,
      watchers: [userId],
    });
    createdTasks.push(task);
  }

  const populatedTasks = await populateTask(
    Task.find({ _id: { $in: createdTasks.map((t) => t._id) } }),
  ).lean();

  populatedTasks.forEach((t) => {
    emitTaskEvent(workspace._id.toString(), "task:created", { task: t, userId });
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_pipeline.template_applied",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: { field: "template", newValue: template.name },
  });

  res.status(201).json({ status: "success", data: { tasks: populatedTasks } });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/events/:eventId/pipeline/save-as-template
// ──────────────────────────────────────────────
exports.saveAsTemplate = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const { name, description } = req.body;
  const workspace = req.workspace;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return next(new AppError("Nama template harus diisi", 400));
  }

  const event = await Event.findOne({ _id: eventId, workspaceId: workspace._id });
  if (!event) {
    return next(new AppError("Event tidak ditemukan", 404));
  }

  const tasks = await Task.find({
    eventId,
    phase: { $ne: null },
    isArchived: { $ne: true },
  })
    .sort({ phase: 1, columnOrder: 1 })
    .lean();

  const items = tasks.map((t, idx) => ({
    phase: t.phase,
    title: t.title,
    dueDateMode: t.dueDateMode || "absolute",
    dueOffsetDays: t.dueDateMode === "relative" ? t.dueOffsetDays : null,
    order: idx,
  }));

  const template = await PipelineTemplate.create({
    workspaceId: workspace._id,
    name: name.trim(),
    description: description || "",
    items,
    createdBy: userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "event_pipeline.template_saved",
    targetType: "event",
    targetId: event._id,
    targetName: event.title,
    details: { field: "template", newValue: template.name },
  });

  res.status(201).json({ status: "success", data: { template } });
});
