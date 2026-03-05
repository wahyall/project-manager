const Task = require("../models/Task");
const Event = require("../models/Event");
const ActivityLog = require("../models/ActivityLog");
const catchAsync = require("../utils/catchAsync");

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/dashboard
// ──────────────────────────────────────────────
exports.getDashboard = catchAsync(async (req, res) => {
  const workspace = req.workspace;
  const workspaceId = workspace._id;
  const userId = req.user.id;

  // Find the "Done" column id (last column or name "Done")
  const doneColumn = workspace.kanbanColumns?.find(
    (col) => col.name.toLowerCase() === "done",
  );
  const doneColumnId = doneColumn?._id;

  // Build column id set that is NOT done (for "active" tasks)
  const nonDoneColumnIds =
    workspace.kanbanColumns
      ?.filter((col) => col.name.toLowerCase() !== "done")
      .map((col) => col._id) || [];

  // 7 days ago for "completed this week"
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const now = new Date();

  // ── Run all queries in parallel ───────────────────
  const [
    activeTasks,
    completedThisWeek,
    overdueTasks,
    ongoingEvents,
    myTasks,
    upcomingEventsList,
    recentActivity,
  ] = await Promise.all([
    // 1. Active tasks count (assigned to user, not Done, not Archived)
    Task.countDocuments({
      workspaceId,
      assignees: userId,
      columnId: { $in: nonDoneColumnIds },
      isArchived: { $ne: true },
    }),

    // 2. Tasks completed this week (moved to Done col in last 7 days)
    doneColumnId
      ? Task.countDocuments({
          workspaceId,
          columnId: doneColumnId,
          isArchived: { $ne: true },
          updatedAt: { $gte: sevenDaysAgo },
        })
      : 0,

    // 3. Overdue tasks (assigned to user, due date passed, not Done)
    Task.countDocuments({
      workspaceId,
      assignees: userId,
      dueDate: { $lt: now, $ne: null },
      columnId: { $in: nonDoneColumnIds },
      isArchived: { $ne: true },
    }),

    // 4. Ongoing events count
    Event.countDocuments({
      workspaceId,
      status: "ongoing",
    }),

    // 5. My tasks list (top 10, sorted by due date)
    Task.find({
      workspaceId,
      assignees: userId,
      columnId: { $in: nonDoneColumnIds },
      isArchived: { $ne: true },
    })
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(10)
      .populate("assignees", "name avatar")
      .populate("eventId", "title color")
      .populate("labels", "name color")
      .select(
        "title dueDate priority columnId eventId labels assignees subtasks",
      )
      .lean(),

    // 6. Upcoming & ongoing events (top 5)
    Event.find({
      workspaceId,
      status: { $in: ["upcoming", "ongoing"] },
    })
      .sort({ startDate: 1 })
      .limit(5)
      .populate("participants", "name avatar")
      .select("title status startDate endDate color participants")
      .lean(),

    // 7. Recent activity (10 latest)
    ActivityLog.find({ workspaceId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("actorId", "name email avatar")
      .lean(),
  ]);

  // Enrich myTasks with column name from workspace.kanbanColumns
  const columnMap = {};
  workspace.kanbanColumns?.forEach((col) => {
    columnMap[col._id.toString()] = { name: col.name, color: col.color };
  });

  const enrichedTasks = myTasks.map((task) => ({
    ...task,
    column: columnMap[task.columnId?.toString()] || {
      name: "Unknown",
      color: "#6B7280",
    },
  }));

  // Count tasks per event for upcoming events
  const eventIds = upcomingEventsList.map((e) => e._id);
  const taskCountsByEvent = await Task.aggregate([
    {
      $match: {
        workspaceId,
        eventId: { $in: eventIds },
        isDeleted: { $ne: true },
        isArchived: { $ne: true },
      },
    },
    {
      $group: { _id: "$eventId", count: { $sum: 1 } },
    },
  ]);
  const taskCountMap = {};
  taskCountsByEvent.forEach((tc) => {
    taskCountMap[tc._id.toString()] = tc.count;
  });

  const enrichedEvents = upcomingEventsList.map((event) => ({
    ...event,
    taskCount: taskCountMap[event._id.toString()] || 0,
  }));

  res.status(200).json({
    status: "success",
    data: {
      stats: {
        activeTasks,
        completedThisWeek,
        overdueTasks,
        ongoingEvents,
      },
      myTasks: enrichedTasks,
      upcomingEvents: enrichedEvents,
      recentActivity,
    },
  });
});
