const Task = require("../models/Task");
const Event = require("../models/Event");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/calendar — Calendar data
// ──────────────────────────────────────────────
exports.getCalendarData = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const {
    startDate,
    endDate,
    assignee,
    priority,
    label,
    eventId,
    type = "all",
  } = req.query;

  if (!startDate || !endDate) {
    return next(
      new AppError("startDate dan endDate harus disertakan", 400),
    );
  }

  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);

  if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
    return next(new AppError("Format tanggal tidak valid", 400));
  }

  // ── Fetch tasks ────────────────────────────────
  let tasks = [];

  if (type === "all" || type === "tasks") {
    const taskFilter = {
      workspaceId: workspace._id,
      isArchived: { $ne: true },
      // Task visible in calendar if it has dueDate OR startDate in the range
      $or: [
        // Task with dueDate in range
        { dueDate: { $gte: rangeStart, $lte: rangeEnd } },
        // Task with startDate in range
        { startDate: { $gte: rangeStart, $lte: rangeEnd } },
        // Task spanning the range (startDate before range, dueDate after range)
        {
          startDate: { $lte: rangeStart },
          dueDate: { $gte: rangeEnd },
        },
        // Task with startDate before range end and dueDate after range start (overlap)
        {
          startDate: { $lte: rangeEnd },
          dueDate: { $gte: rangeStart },
        },
      ],
    };

    // Optional filters
    if (assignee) {
      taskFilter.assignees = assignee;
    }
    if (priority) {
      taskFilter.priority = priority;
    }
    if (label) {
      taskFilter.labels = label;
    }
    if (eventId) {
      taskFilter.eventId = eventId;
    }

    tasks = await Task.find(taskFilter)
      .populate("assignees", "name email avatar")
      .populate("watchers", "name email avatar")
      .populate("labels", "name color")
      .populate("createdBy", "name email avatar")
      .populate("blockedBy", "title columnId isArchived")
      .sort({ dueDate: 1 })
      .lean();
  }

  // ── Fetch events ────────────────────────────────
  let events = [];

  if (type === "all" || type === "events") {
    const eventFilter = {
      workspaceId: workspace._id,
      $or: [
        // Event with startDate in range
        { startDate: { $gte: rangeStart, $lte: rangeEnd } },
        // Event with endDate in range
        { endDate: { $gte: rangeStart, $lte: rangeEnd } },
        // Event spanning the entire range
        {
          startDate: { $lte: rangeStart },
          endDate: { $gte: rangeEnd },
        },
      ],
    };

    events = await Event.find(eventFilter)
      .populate("participants", "name email avatar")
      .populate("createdBy", "name email avatar")
      .sort({ startDate: 1 })
      .lean();
  }

  res.status(200).json({
    status: "success",
    data: {
      tasks,
      events,
    },
  });
});

