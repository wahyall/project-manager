const mongoose = require("mongoose");
const Task = require("../models/Task");
const WorkspaceLabel = require("../models/WorkspaceLabel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const {
  hasCircularDependency,
  getDoneColumnIds,
  isValidColumn,
  getNextColumnOrder,
  computeDueDateFromOffset,
} = require("../services/task.service");
const Event = require("../models/Event");
const ActivityLogService = require("../services/activityLog.service");
const NotificationService = require("../services/notification.service");
const EmbeddingService = require("../services/embedding.service");
const {
  toIdString,
  resolveTaskDivisions,
  normalizeDivisionPics,
  canManageTaskDivisions,
  validateSubtaskAssignees,
} = require("../services/taskDivision.service");
const { extractMentions } = require("../utils/extractMentions");
const {
  applyTaskDivisionScope,
  assertCanViewDivisionItem,
  assertCanViewTask,
} = require("../utils/divisionScope");

const divisionPopulate = {
  path: "divisionId",
  select: "name color members",
  populate: {
    path: "members.userId",
    select: "name email avatar",
  },
};

const divisionIdsPopulate = {
  path: "divisionIds",
  select: "name color",
};

const divisionPicDivisionPopulate = {
  path: "divisionPics.divisionId",
  select: "name color",
};

const divisionPicUserPopulate = {
  path: "divisionPics.userId",
  select: "name email avatar",
};

const subtaskPopulates = [
  { path: "subtasks.assignee", select: "name email avatar" },
  { path: "subtasks.divisionId", select: "name color" },
  { path: "subtasks.completedBy", select: "name email avatar" },
];

const applyTaskPopulates = (query) => {
  let nextQuery = query
    .populate("assignees", "name email avatar")
    .populate("watchers", "name email avatar")
    .populate("labels", "name color")
    .populate(divisionPopulate)
    .populate(divisionIdsPopulate)
    .populate(divisionPicDivisionPopulate)
    .populate(divisionPicUserPopulate)
    .populate("createdBy", "name email avatar")
    .populate("blockedBy", "title columnId isArchived");

  for (const populate of subtaskPopulates) {
    nextQuery = nextQuery.populate(populate);
  }

  return nextQuery;
};

const normalizeCoordinationText = (value) =>
  typeof value === "string" ? value.trim().slice(0, 2000) : "";

const normalizeCoordination = (coordination = {}) => ({
  constraints: normalizeCoordinationText(coordination?.constraints),
  helpNeeded: normalizeCoordinationText(coordination?.helpNeeded),
  followUp: normalizeCoordinationText(coordination?.followUp),
});

// Helper: get Socket.io instance (safe)
const getIO = () => {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
};

// Helper: emit task event to workspace room
const emitTaskEvent = (workspaceId, event, data) => {
  const io = getIO();
  if (io) {
    io.to(`workspace:${workspaceId}`).emit(event, data);
  }
};

// Validate + resolve phase-related fields shared by create and update.
// Returns { phase, dueDateMode, dueOffsetDays, computedDueDate } or calls
// next(AppError) and returns null.
const resolvePhaseFields = async ({
  phase,
  dueDateMode,
  dueOffsetDays,
  eventId,
  next,
}) => {
  if (phase === undefined) {
    return { phase: undefined, dueDateMode: undefined, dueOffsetDays: undefined, computedDueDate: undefined };
  }
  if (phase !== null && !eventId) {
    next(new AppError("Task dengan fase harus terhubung ke event", 400));
    return null;
  }
  if (phase === null) {
    return { phase: null, dueDateMode: null, dueOffsetDays: null, computedDueDate: null };
  }
  if (dueDateMode === "relative") {
    if (dueOffsetDays === undefined || dueOffsetDays === null) {
      next(new AppError("Offset hari harus diisi untuk mode relatif", 400));
      return null;
    }
    const event = await Event.findById(eventId).select("startDate endDate").lean();
    if (!event) {
      next(new AppError("Event tidak ditemukan", 404));
      return null;
    }
    return {
      phase,
      dueDateMode: "relative",
      dueOffsetDays: Number(dueOffsetDays),
      computedDueDate: computeDueDateFromOffset(event, phase, dueOffsetDays),
    };
  }
  return {
    phase,
    dueDateMode: dueDateMode || "absolute",
    dueOffsetDays: null,
    computedDueDate: undefined, // caller keeps whatever dueDate was passed in
  };
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/tasks — Daftar task
// ──────────────────────────────────────────────
exports.listTasks = catchAsync(async (req, res) => {
  const { id: workspaceId } = req.params;
  const {
    columnId,
    assignee,
    label,
    priority,
    eventId,
    divisionId,
    dueDateFrom,
    dueDateTo,
    keyword,
    isArchived,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 50,
  } = req.query;

  // Build filter
  const filter = { workspaceId };

  if (columnId) filter.columnId = columnId;
  if (assignee) filter.assignees = assignee;
  if (label) filter.labels = label;
  if (priority) filter.priority = priority;
  if (eventId) filter.eventId = eventId;

  // Scope divisi: member/guest dikunci ke divisinya + Tanpa Divisi,
  // owner/admin default semua. Task multi-divisi cocok lewat divisionIds.
  await applyTaskDivisionScope({
    filter,
    workspaceId,
    userId: req.user.id,
    role: req.workspaceMember?.role,
    divisionParam: divisionId,
  });

  // Archive filter (default: non-archived)
  if (isArchived === "true") {
    filter.isArchived = true;
  } else if (isArchived === "all") {
    // Show all
  } else {
    filter.isArchived = { $ne: true };
  }

  // Due date range
  if (dueDateFrom || dueDateTo) {
    filter.dueDate = {};
    if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
    if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
  }

  // Keyword search (title)
  if (keyword) {
    filter.title = { $regex: keyword, $options: "i" };
  }

  // Sort
  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "dueDate",
    "priority",
    "title",
    "columnOrder",
  ];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const sort = { [sortField]: sortOrder === "asc" ? 1 : -1 };

  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [tasks, total] = await Promise.all([
    applyTaskPopulates(Task.find(filter))
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Task.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/tasks — Buat task
// ──────────────────────────────────────────────
exports.createTask = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const userId = req.user.id;

  const {
    title,
    description,
    columnId,
    assignees,
    startDate,
    dueDate,
    priority,
    labels,
    eventId,
    divisionId,
    divisionIds,
    divisionPics,
    coordination,
    subtasks,
    blockedBy,
    phase,
    dueDateMode,
    dueOffsetDays,
  } = req.body;

  if (!title || !title.trim()) {
    return next(new AppError("Judul task harus diisi", 400));
  }

  // Validate columnId
  const targetColumnId = columnId || workspace.kanbanColumns[0]?._id;
  if (!targetColumnId || !isValidColumn(workspace, targetColumnId)) {
    return next(new AppError("Kolom kanban tidak valid", 400));
  }

  // Validate labels exist in workspace
  if (labels && labels.length > 0) {
    const validLabels = await WorkspaceLabel.find({
      _id: { $in: labels },
      workspaceId: workspace._id,
    }).select("_id");
    if (validLabels.length !== labels.length) {
      return next(
        new AppError("Beberapa label tidak ditemukan di workspace ini", 400),
      );
    }
  }

  // Validate blockedBy (no circular — new task has no dependents yet, just validate they exist)
  if (blockedBy && blockedBy.length > 0) {
    const validDeps = await Task.find({
      _id: { $in: blockedBy },
      workspaceId: workspace._id,
    }).select("_id");
    if (validDeps.length !== blockedBy.length) {
      return next(
        new AppError("Beberapa dependency task tidak ditemukan", 400),
      );
    }
  }

  // Divisi Workspace: divisi utama/peminta + divisi terkait.
  // Jika task terhubung ke event, divisi event otomatis menjadi divisi utama.
  let parentEventDivision = null;
  if (eventId) {
    const parentEvent = await Event.findOne({
      _id: eventId,
      workspaceId: workspace._id,
    })
      .select("divisionId")
      .lean();
    if (!parentEvent) {
      return next(new AppError("Event tidak ditemukan", 404));
    }
    parentEventDivision = parentEvent.divisionId || null;
  }

  const requestedPrimary = toIdString(divisionId);
  const eventDivisionId = toIdString(parentEventDivision);
  const rawDivisionIds = Array.isArray(divisionIds) ? divisionIds : [];
  const providedDivisionIds = rawDivisionIds
    .map((id) => toIdString(id))
    .filter(Boolean);

  if (eventId) {
    if (eventDivisionId) {
      if (divisionId !== undefined && requestedPrimary !== eventDivisionId) {
        return next(
          new AppError(
            "Divisi utama task harus sama dengan divisi event",
            400,
          ),
        );
      }
      if (
        divisionIds !== undefined &&
        !providedDivisionIds.includes(eventDivisionId)
      ) {
        return next(
          new AppError(
            "Divisi event wajib termasuk dalam divisi yang terlibat",
            400,
          ),
        );
      }
    } else if (requestedPrimary || providedDivisionIds.length > 0) {
      return next(
        new AppError(
          "Event belum memiliki divisi, task tidak dapat memakai divisi",
          400,
        ),
      );
    }
  }

  const resolvedDivisions = await resolveTaskDivisions({
    workspaceId: workspace._id,
    primaryDivisionId: eventDivisionId || requestedPrimary || undefined,
    divisionIds: eventDivisionId
      ? divisionIds === undefined
        ? [eventDivisionId]
        : rawDivisionIds
      : rawDivisionIds,
  });

  // Member/guest hanya boleh membuat task di divisi utamanya (+ Tanpa Divisi).
  await assertCanViewDivisionItem({
    divisionId: resolvedDivisions.divisionId,
    workspaceId: workspace._id,
    userId,
    role: req.workspaceMember?.role,
  });

  const normalizedDivisionPics = await normalizeDivisionPics({
    workspaceId: workspace._id,
    divisionPics: divisionPics || [],
    divisions: resolvedDivisions.divisions,
  });

  // Calculate order
  const columnOrder = await getNextColumnOrder(workspace._id, targetColumnId);

  // Process subtasks with order + metadata
  const processedSubtasks = [];
  if (Array.isArray(subtasks)) {
    for (let idx = 0; idx < subtasks.length; idx += 1) {
      const st = subtasks[idx];
      const subtaskTitle =
        typeof st.title === "string" ? st.title.trim() : "";
      if (!subtaskTitle) {
        return next(new AppError("Judul subtask tidak boleh kosong", 400));
      }

      const subtaskDueDate = st.dueDate ? new Date(st.dueDate) : null;
      if (subtaskDueDate && Number.isNaN(subtaskDueDate.getTime())) {
        return next(new AppError("Tanggal subtask tidak valid", 400));
      }

      const isCompleted = st.isCompleted === true;
      processedSubtasks.push({
        title: subtaskTitle,
        isCompleted,
        assignee: st.assignee || null,
        divisionId: st.divisionId || null,
        dueDate: subtaskDueDate,
        notes:
          typeof st.notes === "string" ? st.notes.trim().slice(0, 1000) : "",
        completedBy: isCompleted ? userId : null,
        completedAt: isCompleted ? new Date() : null,
        order: st.order !== undefined ? st.order : idx,
      });
    }
  }

  await validateSubtaskAssignees({
    workspaceId: workspace._id,
    subtasks: processedSubtasks,
    divisionIds: resolvedDivisions.divisionIds,
    divisions: resolvedDivisions.divisions,
  });

  const resolvedPhase = await resolvePhaseFields({
    phase,
    dueDateMode,
    dueOffsetDays,
    eventId: eventId || null,
    next,
  });
  if (resolvedPhase === null) return; // resolvePhaseFields already called next()

  const task = await Task.create({
    workspaceId: workspace._id,
    title: title.trim(),
    description: description || "",
    columnId: targetColumnId,
    columnOrder,
    assignees: assignees || [],
    watchers: [userId], // Creator auto-watches
    startDate: startDate || null,
    dueDate:
      resolvedPhase.computedDueDate !== undefined
        ? resolvedPhase.computedDueDate
        : dueDate || null,
    priority: priority || "medium",
    labels: labels || [],
    eventId: eventId || null,
    divisionId: resolvedDivisions.divisionId,
    divisionIds: resolvedDivisions.divisionIds,
    divisionPics: normalizedDivisionPics,
    coordination: normalizeCoordination(coordination),
    subtasks: processedSubtasks,
    blockedBy: blockedBy || [],
    createdBy: userId,
    phase: resolvedPhase.phase ?? null,
    dueDateMode: resolvedPhase.dueDateMode ?? null,
    dueOffsetDays: resolvedPhase.dueOffsetDays ?? null,
  });

  // Populate for response
  const populatedTask = await applyTaskPopulates(
    Task.findById(task._id),
  ).lean();

  // Emit Socket.io event
  emitTaskEvent(workspace._id.toString(), "task:created", {
    task: populatedTask,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.created",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
  });

  // ── Trigger Notifications ──
  const taskUrl = `/workspace/${workspace._id}/tasks/${task._id}`;

  // 1. Assign Task Notification (except creator)
  if (assignees && assignees.length > 0) {
    await NotificationService.createForMany({
      workspaceId: workspace._id,
      recipientIds: assignees,
      actorId: userId,
      type: "assign_task",
      targetType: "task",
      targetId: task._id,
      message: `Tugas baru ditugaskan ke kamu: ${task.title}`,
      url: taskUrl,
    });
  }

  // 2. PIC divisi notification
  const newPicIds = [
    ...new Set(
      normalizedDivisionPics
        .map((pic) => pic.userId.toString())
        .filter((id) => id !== userId.toString()),
    ),
  ];
  if (newPicIds.length > 0) {
    await NotificationService.createForMany({
      workspaceId: workspace._id,
      recipientIds: newPicIds,
      actorId: userId,
      type: "assign_task",
      targetType: "task",
      targetId: task._id,
      message: `Kamu menjadi PIC divisi pada task: ${task.title}`,
      url: taskUrl,
    });
  }

  // 3. PIC subtask notification
  const subtaskAssigneeIds = [
    ...new Set(
      processedSubtasks
        .map((st) => st.assignee?.toString())
        .filter((id) => id && id !== userId.toString()),
    ),
  ];
  if (subtaskAssigneeIds.length > 0) {
    await NotificationService.createForMany({
      workspaceId: workspace._id,
      recipientIds: subtaskAssigneeIds,
      actorId: userId,
      type: "assign_task",
      targetType: "task",
      targetId: task._id,
      message: `Kamu mendapat checklist pada task: ${task.title}`,
      url: taskUrl,
    });
  }

  // 4. Mention Notification (from description)
  // Deskripsi disimpan sebagai array blocks BlockNote polos
  // (MentionEditor mengirim JSON.stringify(blocks)), jadi mention
  // diekstrak langsung dari inline node, bukan dari field .mentions.
  if (description) {
    const mentions = extractMentions(description);
    if (mentions.length > 0) {
      const mentionedUserIds = mentions.map((m) => m.userId);
      await NotificationService.createForMany({
        workspaceId: workspace._id,
        recipientIds: mentionedUserIds,
        actorId: userId,
        type: "mention",
        targetType: "task",
        targetId: task._id,
        message: `menyebut kamu di deskripsi task "${task.title}"`,
        url: taskUrl,
      });
    }
  }

  // Embedding sync (fire-and-forget)
  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "task",
    sourceId: task._id,
    content: EmbeddingService._buildTaskContent(populatedTask),
    metadata: {
      title: task.title,
      status: task.columnId?.toString(),
      assignees: populatedTask.assignees?.map((a) => a.name) || [],
      priority: task.priority,
      sourceUrl: `/workspace/${workspace._id}/tasks/${task._id}`,
    },
  }).catch(() => {});

  res.status(201).json({
    status: "success",
    data: { task: populatedTask },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/tasks/:taskId — Detail
// ──────────────────────────────────────────────
exports.getTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;

  const task = await applyTaskPopulates(
    Task.findOne({
      _id: taskId,
      workspaceId: workspace._id,
    }),
  )
    .populate("attachments.uploadedBy", "name email avatar")
    .lean();

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  // Visibility divisi multi-divisi
  await assertCanViewTask({
    task,
    workspaceId: workspace._id,
    userId: req.user.id,
    role: req.workspaceMember?.role,
  });

  res.status(200).json({
    status: "success",
    data: { task },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/tasks/:taskId — Update
// ──────────────────────────────────────────────
exports.updateTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  // Visibility divisi multi-divisi
  await assertCanViewTask({
    task,
    workspaceId: workspace._id,
    userId,
    role: req.workspaceMember?.role,
  });

  // Backup original state for comparison
  const oldAssignees = task.assignees.map((a) => a.toString());
  const oldColumnId = task.columnId.toString();
  const oldDescription = task.description;
  const oldDivisionIds = [
    ...new Set(
      [
        task.divisionId ? task.divisionId.toString() : null,
        ...(task.divisionIds || []).map((id) => id.toString()),
      ].filter(Boolean),
    ),
  ];
  const oldDivisionPics = (task.divisionPics || []).map((pic) => ({
    divisionId: pic.divisionId?.toString(),
    userId: pic.userId?.toString(),
  }));
  const oldSubtasks = (task.subtasks || []).map((st) =>
    typeof st.toObject === "function" ? st.toObject() : st,
  );
  const oldAllSubtasksComplete =
    oldSubtasks.length > 0 && oldSubtasks.every((st) => st.isCompleted);
  const oldCoordination = task.coordination
    ? {
        constraints: task.coordination.constraints || "",
        helpNeeded: task.coordination.helpNeeded || "",
        followUp: task.coordination.followUp || "",
      }
    : { constraints: "", helpNeeded: "", followUp: "" };

  const {
    title,
    description,
    columnId,
    columnOrder,
    assignees,
    startDate,
    dueDate,
    priority,
    labels,
    eventId,
    divisionId,
    divisionIds,
    divisionPics,
    coordination,
    subtasks,
    blockedBy,
    phase,
    dueDateMode,
    dueOffsetDays,
  } = req.body;

  // Track if column changed (for "moved" event)
  let columnChanged = false;
  let datesChanged = false;
  let priorityChanged = false;

  // Title
  if (title !== undefined) {
    if (!title.trim()) {
      return next(new AppError("Judul task tidak boleh kosong", 400));
    }
    task.title = title.trim();
  }

  // Description
  if (description !== undefined) {
    task.description = description;
  }

  // Column (status change)
  if (columnId !== undefined) {
    if (!isValidColumn(workspace, columnId)) {
      return next(new AppError("Kolom kanban tidak valid", 400));
    }
    if (columnId.toString() !== oldColumnId) {
      task.columnId = columnId;
      columnChanged = true;
      // If moving to a new column without explicit order, put at end
      if (columnOrder === undefined) {
        task.columnOrder = await getNextColumnOrder(workspace._id, columnId);
      }
    }
  }

  // Column order
  if (columnOrder !== undefined) {
    task.columnOrder = columnOrder;
  }

  // Assignees
  if (assignees !== undefined) {
    task.assignees = assignees;
  }

  // Dates (track changes for notification)
  if (startDate !== undefined) {
    const oldDate = task.startDate ? new Date(task.startDate).getTime() : null;
    const newDate = startDate ? new Date(startDate).getTime() : null;
    if (oldDate !== newDate) datesChanged = true;
    task.startDate = startDate || null;
  }
  if (dueDate !== undefined) {
    const oldDate = task.dueDate ? new Date(task.dueDate).getTime() : null;
    const newDate = dueDate ? new Date(dueDate).getTime() : null;
    if (oldDate !== newDate) datesChanged = true;
    task.dueDate = dueDate || null;
  }

  // Priority (track changes for notification)
  if (priority !== undefined) {
    if (!["low", "medium", "high", "critical"].includes(priority)) {
      return next(new AppError("Prioritas tidak valid", 400));
    }
    if (task.priority !== priority) priorityChanged = true;
    task.priority = priority;
  }

  // Labels
  if (labels !== undefined) {
    if (labels.length > 0) {
      const validLabels = await WorkspaceLabel.find({
        _id: { $in: labels },
        workspaceId: workspace._id,
      }).select("_id");
      if (validLabels.length !== labels.length) {
        return next(new AppError("Beberapa label tidak ditemukan", 400));
      }
    }
    task.labels = labels;
  }

  // Event + divisi multi-divisi.
  // - Saat attach/pindah event: divisi event menjadi divisi utama, divisi lama
  //   dipertahankan sebagai divisi terkait agar koordinasi tidak hilang.
  // - Saat lepas event: divisi tidak berubah kecuali dikirim eksplisit.
  const nextEventId = eventId !== undefined ? eventId : task.eventId;
  const eventChanged =
    eventId !== undefined &&
    toIdString(eventId) !== toIdString(task.eventId);

  let parentEvent = null;
  if (nextEventId) {
    parentEvent = await Event.findOne({
      _id: nextEventId,
      workspaceId: workspace._id,
    })
      .select("divisionId")
      .lean();
    if (!parentEvent) {
      return next(new AppError("Event tidak ditemukan", 404));
    }
  }

  const eventDivisionId = toIdString(parentEvent?.divisionId);
  const rawDivisionIds = Array.isArray(divisionIds) ? divisionIds : [];
  const providedDivisionIds = rawDivisionIds
    .map((id) => toIdString(id))
    .filter(Boolean);
  const divisionFieldsProvided =
    divisionId !== undefined ||
    divisionIds !== undefined ||
    (eventChanged && !!nextEventId);

  let finalDivisions = null;
  let divisionPermissionChecked = false;

  if (divisionFieldsProvided) {
    // Validasi konsistensi dengan divisi event.
    if (eventDivisionId) {
      if (divisionId !== undefined && toIdString(divisionId) !== eventDivisionId) {
        return next(
          new AppError(
            "Divisi utama task harus sama dengan divisi event",
            400,
          ),
        );
      }
      if (
        divisionIds !== undefined &&
        !providedDivisionIds.includes(eventDivisionId)
      ) {
        return next(
          new AppError(
            "Divisi event wajib termasuk dalam divisi yang terlibat",
            400,
          ),
        );
      }
    } else if (eventChanged && nextEventId) {
      const hasDivisionInput =
        !!toIdString(divisionId) ||
        providedDivisionIds.length > 0 ||
        (Array.isArray(divisionPics) && divisionPics.length > 0);
      if (hasDivisionInput) {
        return next(
          new AppError(
            "Event belum memiliki divisi, task tidak dapat memakai divisi",
            400,
          ),
        );
      }
    }

    let primaryInput;
    let idsInput;

    if (eventDivisionId) {
      primaryInput = eventDivisionId;
      idsInput =
        divisionIds !== undefined
          ? rawDivisionIds
          : [
              eventDivisionId,
              ...oldDivisionIds.filter((id) => id !== eventDivisionId),
            ];
    } else if (divisionIds !== undefined) {
      idsInput = rawDivisionIds;
      primaryInput =
        divisionId !== undefined ? toIdString(divisionId) : undefined;
    } else {
      const primary = toIdString(divisionId);
      primaryInput = primary;
      idsInput = primary ? [primary] : [];
    }

    const canManage = await canManageTaskDivisions({
      workspaceId: workspace._id,
      task,
      userId,
      role: req.workspaceMember?.role,
      nextDivisionIds: idsInput,
    });
    if (!canManage) {
      return next(
        new AppError(
          "Kamu tidak memiliki izin untuk mengubah divisi task ini",
          403,
        ),
      );
    }
    divisionPermissionChecked = true;

    const resolved = await resolveTaskDivisions({
      workspaceId: workspace._id,
      primaryDivisionId: primaryInput,
      divisionIds: idsInput,
    });

    // Cek akses hanya saat divisi utama berubah. Ketua divisi terkait boleh
    // mengubah daftar divisi/PIC tanpa harus menjadi anggota divisi utama.
    if (toIdString(resolved.divisionId) !== toIdString(task.divisionId)) {
      await assertCanViewDivisionItem({
        divisionId: resolved.divisionId,
        workspaceId: workspace._id,
        userId,
        role: req.workspaceMember?.role,
      });
    }

    task.divisionId = resolved.divisionId;
    task.divisionIds = resolved.divisionIds;
    finalDivisions = resolved.divisions;

    // Buang PIC dari divisi yang tidak lagi terlibat. Kalau divisionPics
    // dikirim eksplisit, array tersebut akan menggantikan seluruh daftar.
    if (divisionPics === undefined) {
      const validIds = new Set(resolved.divisionIds.map((id) => id.toString()));
      task.divisionPics = (task.divisionPics || []).filter((pic) =>
        validIds.has(pic.divisionId?.toString()),
      );
    }
  } else {
    finalDivisions = await resolveTaskDivisions({
      workspaceId: workspace._id,
      primaryDivisionId: task.divisionId,
      divisionIds: task.divisionIds?.length ? task.divisionIds : [],
    });
  }

  // Checklist tidak boleh menunjuk divisi yang sudah tidak terlibat. PIC tanpa
  // divisi juga harus tetap berasal dari salah satu divisi yang terlibat.
  const validTaskDivisionIds = new Set(
    finalDivisions.divisionIds.map((id) => id.toString()),
  );
  const taskHasDivisions = validTaskDivisionIds.size > 0;
  for (const subtask of task.subtasks || []) {
    let subtaskDivisionId = toIdString(subtask.divisionId);
    if (subtaskDivisionId && !validTaskDivisionIds.has(subtaskDivisionId)) {
      subtask.divisionId = null;
      subtaskDivisionId = null;
    }

    const assigneeId = toIdString(subtask.assignee);
    if (taskHasDivisions && assigneeId) {
      let isInvolvedMember = false;
      if (subtaskDivisionId) {
        const division = finalDivisions.divisions.find(
          (item) => item._id.toString() === subtaskDivisionId,
        );
        isInvolvedMember = (division?.members || []).some(
          (member) => toIdString(member.userId) === assigneeId,
        );
      } else {
        isInvolvedMember = finalDivisions.divisions.some((division) =>
          (division.members || []).some(
            (member) => toIdString(member.userId) === assigneeId,
          ),
        );
      }
      if (!isInvolvedMember) subtask.assignee = null;
    }
  }

  if (eventId !== undefined) {
    task.eventId = eventId || null;
  }

  if (divisionPics !== undefined) {
    if (!divisionPermissionChecked) {
      const canManage = await canManageTaskDivisions({
        workspaceId: workspace._id,
        task,
        userId,
        role: req.workspaceMember?.role,
        nextDivisionIds: finalDivisions.divisionIds,
      });
      if (!canManage) {
        return next(
          new AppError(
            "Kamu tidak memiliki izin untuk mengubah PIC divisi task ini",
            403,
          ),
        );
      }
    }

    const normalizedPics = await normalizeDivisionPics({
      workspaceId: workspace._id,
      divisionPics: divisionPics || [],
      divisions: finalDivisions.divisions,
    });
    task.divisionPics = normalizedPics;
  }

  // Phase (pipeline)
  if (phase !== undefined) {
    const resolvedPhase = await resolvePhaseFields({
      phase,
      dueDateMode: dueDateMode !== undefined ? dueDateMode : task.dueDateMode,
      dueOffsetDays: dueOffsetDays !== undefined ? dueOffsetDays : task.dueOffsetDays,
      eventId: eventId !== undefined ? eventId : task.eventId,
      next,
    });
    if (resolvedPhase === null) return;
    task.phase = resolvedPhase.phase;
    task.dueDateMode = resolvedPhase.dueDateMode;
    task.dueOffsetDays = resolvedPhase.dueOffsetDays;
    if (resolvedPhase.computedDueDate !== undefined) {
      task.dueDate = resolvedPhase.computedDueDate;
    }
  } else if (dueDateMode !== undefined && task.phase) {
    // Changing due date mode without changing phase itself
    const resolvedPhase = await resolvePhaseFields({
      phase: task.phase,
      dueDateMode,
      dueOffsetDays,
      eventId: task.eventId,
      next,
    });
    if (resolvedPhase === null) return;
    task.dueDateMode = resolvedPhase.dueDateMode;
    task.dueOffsetDays = resolvedPhase.dueOffsetDays;
    if (resolvedPhase.computedDueDate !== undefined) {
      task.dueDate = resolvedPhase.computedDueDate;
    }
  }

  // Subtasks
  let newAllSubtasksComplete = oldAllSubtasksComplete;
  const completedSubtaskIds = [];
  const newlyAssignedSubtasks = [];
  if (subtasks !== undefined) {
    if (!Array.isArray(subtasks)) {
      return next(new AppError("Format checklist tidak valid", 400));
    }
    const memberRole = req.workspaceMember?.role;
    const oldById = new Map(
      oldSubtasks.map((st) => [st._id.toString(), st]),
    );
    const processedSubtasks = [];

    for (let idx = 0; idx < subtasks.length; idx += 1) {
      const st = subtasks[idx];
      const subtaskTitle =
        typeof st.title === "string" ? st.title.trim() : "";
      if (!subtaskTitle) {
        return next(new AppError("Judul subtask tidak boleh kosong", 400));
      }

      const subtaskDueDate = st.dueDate ? new Date(st.dueDate) : null;
      if (subtaskDueDate && Number.isNaN(subtaskDueDate.getTime())) {
        return next(new AppError("Tanggal subtask tidak valid", 400));
      }

      const subtaskId = st._id
        ? st._id.toString()
        : new mongoose.Types.ObjectId().toString();
      const oldSubtask = oldById.get(subtaskId);
      const isCompleted = st.isCompleted === true;
      const oldCompleted = oldSubtask?.isCompleted === true;
      const assignee = st.assignee || null;
      const divisionId = st.divisionId || null;

      let completedBy = oldSubtask?.completedBy || null;
      let completedAt = oldSubtask?.completedAt || null;

      if (oldSubtask && oldCompleted !== isCompleted) {
        const oldAssigneeId = toIdString(oldSubtask.assignee);
        const canToggle =
          ["owner", "admin"].includes(memberRole) ||
          toIdString(task.createdBy) === userId.toString() ||
          !oldAssigneeId ||
          oldAssigneeId === userId.toString();

        if (!canToggle) {
          return next(
            new AppError(
              "Hanya PIC subtask, pembuat task, atau owner/admin yang dapat mengubah status checklist",
              403,
            ),
          );
        }

        if (isCompleted) {
          completedBy = userId;
          completedAt = new Date();
          completedSubtaskIds.push(subtaskId);
        } else {
          completedBy = null;
          completedAt = null;
        }
      } else if (!oldSubtask && isCompleted) {
        const canCreateCompleted =
          ["owner", "admin"].includes(memberRole) ||
          toIdString(task.createdBy) === userId.toString();
        if (!canCreateCompleted) {
          return next(
            new AppError(
              "Hanya pembuat task atau owner/admin yang dapat menambah checklist selesai",
              403,
            ),
          );
        }
        completedBy = userId;
        completedAt = new Date();
        completedSubtaskIds.push(subtaskId);
      }

      processedSubtasks.push({
        _id: subtaskId,
        title: subtaskTitle,
        isCompleted,
        assignee,
        divisionId,
        dueDate: subtaskDueDate,
        notes:
          typeof st.notes === "string" ? st.notes.trim().slice(0, 1000) : "",
        completedBy,
        completedAt,
        order: st.order !== undefined ? st.order : idx,
      });

      const oldAssigneeId = toIdString(oldSubtask?.assignee);
      const newAssigneeId = toIdString(assignee);
      if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
        newlyAssignedSubtasks.push({
          title: subtaskTitle,
          assignee: assignee,
        });
      }
    }

    await validateSubtaskAssignees({
      workspaceId: workspace._id,
      subtasks: processedSubtasks,
      divisionIds: task.divisionIds?.length
        ? task.divisionIds
        : task.divisionId
          ? [task.divisionId]
          : [],
      divisions: finalDivisions?.divisions || [],
    });

    task.subtasks = processedSubtasks;
    newAllSubtasksComplete =
      processedSubtasks.length > 0 &&
      processedSubtasks.every((subtask) => subtask.isCompleted);
  }

  // Kolom koordinasi (boleh diubah member yang punya akses task)
  if (coordination !== undefined && coordination !== null) {
    if (typeof coordination !== "object" || Array.isArray(coordination)) {
      return next(new AppError("Format data koordinasi tidak valid", 400));
    }
    task.coordination = {
      constraints:
        coordination.constraints !== undefined
          ? normalizeCoordinationText(coordination.constraints)
          : oldCoordination.constraints,
      helpNeeded:
        coordination.helpNeeded !== undefined
          ? normalizeCoordinationText(coordination.helpNeeded)
          : oldCoordination.helpNeeded,
      followUp:
        coordination.followUp !== undefined
          ? normalizeCoordinationText(coordination.followUp)
          : oldCoordination.followUp,
    };
  }

  // Dependencies
  if (blockedBy !== undefined) {
    if (blockedBy.length > 0) {
      // Validate they exist in same workspace
      const validDeps = await Task.find({
        _id: { $in: blockedBy },
        workspaceId: workspace._id,
      }).select("_id");
      if (validDeps.length !== blockedBy.length) {
        return next(
          new AppError("Beberapa dependency task tidak ditemukan", 400),
        );
      }

      // Check circular dependency
      const isCircular = await hasCircularDependency(taskId, blockedBy);
      if (isCircular) {
        return next(new AppError("Circular dependency terdeteksi", 400));
      }
    }
    task.blockedBy = blockedBy;
  }

  // Invariant: a task with a phase must remain linked to an event, even if
  // eventId was cleared independently of phase/dueDateMode in this request.
  if (task.phase && !task.eventId) {
    return next(new AppError("Task dengan fase harus terhubung ke event", 400));
  }

  await task.save();

  // Populate for response
  const populatedTask = await applyTaskPopulates(
    Task.findById(task._id),
  ).lean();

  // Emit Socket.io event
  const eventName = columnChanged ? "task:moved" : "task:updated";
  emitTaskEvent(workspace._id.toString(), eventName, {
    task: populatedTask,
    userId,
    ...(columnChanged && {
      fromColumnId: oldColumnId,
      toColumnId: columnId.toString(),
    }),
  });

  // Activity Log
  if (columnChanged) {
    const newColName =
      workspace.kanbanColumns?.find(
        (c) => c._id.toString() === columnId.toString(),
      )?.name || columnId.toString();
    ActivityLogService.log({
      workspaceId: workspace._id,
      actorId: userId,
      action: "task.moved",
      targetType: "task",
      targetId: task._id,
      targetName: task.title,
      details: { field: "columnId", newValue: newColName },
    });
  } else {
    // Activity log — determine what changed
    const changes = [];
    if (title !== undefined && title !== task.title) changes.push("title");
    if (description !== undefined && description !== oldDescription)
      changes.push("description");
    if (assignees !== undefined) changes.push("assignees");
    if (datesChanged) changes.push("dates");
    if (priorityChanged) changes.push("priority");
    if (divisionId !== undefined || divisionIds !== undefined || eventChanged) {
      changes.push("divisions");
    }
    if (divisionPics !== undefined) changes.push("divisionPics");
    if (coordination !== undefined) changes.push("coordination");
    if (subtasks !== undefined) changes.push("subtasks");

    if (changes.length > 0) {
      ActivityLogService.log({
        workspaceId: workspace._id,
        actorId: userId,
        action: "task.updated",
        targetType: "task",
        targetId: task._id,
        targetName: task.title,
        details:
          changes.length === 1 ? { field: changes[0] } : { fields: changes },
      });
    }
  }

  // ── Trigger Notifications ──
  const taskUrl = `/workspace/${workspace._id}/tasks/${task._id}`;

  // 1. Assign Task Notification (new assignees only)
  if (assignees !== undefined) {
    const newAssignees = assignees.filter(
      (a) => !oldAssignees.includes(a.toString()),
    );
    if (newAssignees.length > 0) {
      await NotificationService.createForMany({
        workspaceId: workspace._id,
        recipientIds: newAssignees,
        actorId: userId,
        type: "assign_task",
        targetType: "task",
        targetId: task._id,
        message: `Ditugaskan ke kamu: ${task.title}`,
        url: taskUrl,
      });
    }
  }

  // 2. PIC divisi notification (new PIC only)
  if (divisionPics !== undefined) {
    const oldPicIds = new Set(
      oldDivisionPics.map((pic) => pic.userId).filter(Boolean),
    );
    const newPicIds = [
      ...new Set(
        (task.divisionPics || [])
          .map((pic) => toIdString(pic.userId))
          .filter(
            (id) => id && !oldPicIds.has(id) && id !== userId.toString(),
          ),
      ),
    ];

    if (newPicIds.length > 0) {
      await NotificationService.createForMany({
        workspaceId: workspace._id,
        recipientIds: newPicIds,
        actorId: userId,
        type: "assign_task",
        targetType: "task",
        targetId: task._id,
        message: `Kamu menjadi PIC divisi pada task: ${task.title}`,
        url: taskUrl,
      });
    }
  }

  // 3. Checklist assignment notification
  if (newlyAssignedSubtasks.length > 0) {
    const assigneeIds = [
      ...new Set(
        newlyAssignedSubtasks
          .map((subtask) => toIdString(subtask.assignee))
          .filter((id) => id && id !== userId.toString()),
      ),
    ];

    if (assigneeIds.length > 0) {
      await NotificationService.createForMany({
        workspaceId: workspace._id,
        recipientIds: assigneeIds,
        actorId: userId,
        type: "assign_task",
        targetType: "task",
        targetId: task._id,
        message: `Kamu mendapat checklist pada task: ${task.title}`,
        url: taskUrl,
      });
    }
  }

  // 4. Checklist completion notification
  if (subtasks !== undefined && completedSubtaskIds.length > 0) {
    const checklistRecipients = new Set(
      [
        toIdString(task.createdBy),
        ...(task.divisionPics || []).map((pic) =>
          toIdString(pic.userId),
        ),
        ...(task.watchers || []).map((id) => toIdString(id)),
        ...(task.assignees || []).map((id) => toIdString(id)),
      ].filter(Boolean),
    );
    checklistRecipients.delete(userId.toString());

    if (checklistRecipients.size > 0) {
      const allCompleteNow =
        !oldAllSubtasksComplete && newAllSubtasksComplete;
      const message = allCompleteNow
        ? `Semua checklist selesai: ${task.title}`
        : `${completedSubtaskIds.length} checklist selesai: ${task.title}`;

      await NotificationService.createForMany({
        workspaceId: workspace._id,
        recipientIds: [...checklistRecipients],
        actorId: userId,
        type: "task_update",
        targetType: "task",
        targetId: task._id,
        message,
        url: taskUrl,
      });
    }
  }

  // 5. Mention Notification (from new description)
  // Hanya mention yang benar-benar baru yang dinotifikasi.
  if (description !== undefined && description !== oldDescription) {
    const newMentions = extractMentions(description).map((m) =>
      m.userId.toString(),
    );
    const oldMentions = extractMentions(oldDescription).map((m) =>
      m.userId.toString(),
    );

    const newlyMentionedUserIds = newMentions.filter(
      (id) => !oldMentions.includes(id),
    );

    if (newlyMentionedUserIds.length > 0) {
      await NotificationService.createForMany({
        workspaceId: workspace._id,
        recipientIds: newlyMentionedUserIds,
        actorId: userId,
        type: "mention",
        targetType: "task",
        targetId: task._id,
        message: `menyebut kamu di deskripsi task "${task.title}"`,
        url: taskUrl,
      });
    }
  }

  // 3. Task Update Notification (if moved or important fields changed)
  const isImportantUpdate = columnChanged || priorityChanged || datesChanged;
  if (isImportantUpdate) {
    // Notify all assignees and watchers except the actor
    const allWatchersAndAssignees = new Set([
      ...task.assignees.map((id) => id.toString()),
      ...task.watchers.map((id) => id.toString()),
    ]);

    // Remove actor from recipients inside set
    allWatchersAndAssignees.delete(userId.toString());

    if (allWatchersAndAssignees.size > 0) {
      let updateMsg = `Tugas diperbarui: ${task.title}`;
      if (columnChanged) updateMsg = `Status tugas diubah: ${task.title}`;
      else if (priorityChanged)
        updateMsg = `Prioritas tugas diubah: ${task.title}`;
      else if (datesChanged)
        updateMsg = `Tenggat waktu tugas diubah: ${task.title}`;

      await NotificationService.createForMany({
        workspaceId: workspace._id,
        recipientIds: Array.from(allWatchersAndAssignees),
        actorId: userId,
        type: "task_update",
        targetType: "task",
        targetId: task._id,
        message: updateMsg,
        url: taskUrl,
      });
    }
  }

  // Embedding sync (fire-and-forget)
  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "task",
    sourceId: task._id,
    content: EmbeddingService._buildTaskContent(populatedTask),
    metadata: {
      title: task.title,
      status: task.columnId?.toString(),
      assignees: populatedTask.assignees?.map((a) => a.name) || [],
      priority: task.priority,
      sourceUrl: `/workspace/${workspace._id}/tasks/${task._id}`,
    },
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    data: { task: populatedTask },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/tasks/:taskId — Soft delete
// ──────────────────────────────────────────────
exports.deleteTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;
  const memberRole = req.workspaceMember.role;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  // Visibility divisi multi-divisi
  await assertCanViewTask({
    task,
    workspaceId: workspace._id,
    userId,
    role: req.workspaceMember?.role,
  });

  // Permission check: creator, admin, or owner
  const isCreator = task.createdBy.toString() === userId;
  const isAdminOrOwner = ["owner", "admin"].includes(memberRole);

  if (!isCreator && !isAdminOrOwner) {
    return next(
      new AppError("Kamu tidak memiliki izin untuk menghapus task ini", 403),
    );
  }

  task.isDeleted = true;
  task.deletedAt = new Date();
  await task.save();

  // Emit Socket.io event
  emitTaskEvent(workspace._id.toString(), "task:deleted", {
    taskId: task._id,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.deleted",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
  });

  // Embedding remove (fire-and-forget)
  EmbeddingService.remove({
    sourceType: "task",
    sourceId: task._id,
    workspaceId: workspace._id,
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    message: "Task berhasil dihapus",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/tasks/:taskId/archive
// ──────────────────────────────────────────────
exports.archiveTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  // Visibility divisi multi-divisi
  await assertCanViewTask({
    task,
    workspaceId: workspace._id,
    userId,
    role: req.workspaceMember?.role,
  });

  if (task.isArchived) {
    return next(new AppError("Task sudah diarsipkan", 400));
  }

  task.isArchived = true;
  task.archivedAt = new Date();
  await task.save();

  emitTaskEvent(workspace._id.toString(), "task:archived", {
    taskId: task._id,
    isArchived: true,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.archived",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
  });

  res.status(200).json({
    status: "success",
    message: "Task berhasil diarsipkan",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/tasks/:taskId/unarchive
// ──────────────────────────────────────────────
exports.unarchiveTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  // Visibility divisi multi-divisi
  await assertCanViewTask({
    task,
    workspaceId: workspace._id,
    userId,
    role: req.workspaceMember?.role,
  });

  if (!task.isArchived) {
    return next(new AppError("Task tidak sedang diarsipkan", 400));
  }

  task.isArchived = false;
  task.archivedAt = null;
  await task.save();

  emitTaskEvent(workspace._id.toString(), "task:archived", {
    taskId: task._id,
    isArchived: false,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.unarchived",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
  });

  res.status(200).json({
    status: "success",
    message: "Task berhasil diunarsipkan",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/tasks/archive-done — Bulk
// ──────────────────────────────────────────────
exports.bulkArchiveDone = catchAsync(async (req, res) => {
  const workspace = req.workspace;
  const userId = req.user.id;

  const doneColumnIds = getDoneColumnIds(workspace);

  if (doneColumnIds.length === 0) {
    return res.status(200).json({
      status: "success",
      data: { archivedCount: 0 },
      message: "Tidak ada kolom 'Done' ditemukan",
    });
  }

  const result = await Task.updateMany(
    await applyTaskDivisionScope({
      filter: {
        workspaceId: workspace._id,
        columnId: { $in: doneColumnIds },
        isArchived: { $ne: true },
        isDeleted: { $ne: true },
      },
      workspaceId: workspace._id,
      userId,
      role: req.workspaceMember?.role,
    }),
    {
      $set: { isArchived: true, archivedAt: new Date() },
    },
  );

  emitTaskEvent(workspace._id.toString(), "task:bulk-archived", {
    columnIds: doneColumnIds.map((id) => id.toString()),
    archivedCount: result.modifiedCount,
    userId,
  });

  res.status(200).json({
    status: "success",
    data: { archivedCount: result.modifiedCount },
    message: `${result.modifiedCount} task berhasil diarsipkan`,
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/tasks/:taskId/watch
// ──────────────────────────────────────────────
exports.watchTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  // Visibility divisi multi-divisi
  await assertCanViewTask({
    task,
    workspaceId: workspace._id,
    userId,
    role: req.workspaceMember?.role,
  });

  const alreadyWatching = task.watchers.some((w) => w.toString() === userId);

  if (alreadyWatching) {
    return res.status(200).json({
      status: "success",
      message: "Kamu sudah menjadi watcher task ini",
    });
  }

  task.watchers.push(userId);
  await task.save();

  res.status(200).json({
    status: "success",
    message: "Berhasil menjadi watcher task ini",
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/tasks/:taskId/watch
// ──────────────────────────────────────────────
exports.unwatchTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  // Visibility divisi multi-divisi
  await assertCanViewTask({
    task,
    workspaceId: workspace._id,
    userId,
    role: req.workspaceMember?.role,
  });

  task.watchers = task.watchers.filter((w) => w.toString() !== userId);
  await task.save();

  res.status(200).json({
    status: "success",
    message: "Berhasil berhenti menjadi watcher",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/tasks/:taskId/attachments
// ──────────────────────────────────────────────
exports.uploadAttachment = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  if (!req.file) {
    return next(new AppError("File harus disertakan", 400));
  }

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  // Visibility divisi multi-divisi
  await assertCanViewTask({
    task,
    workspaceId: workspace._id,
    userId,
    role: req.workspaceMember?.role,
  });

  // TODO: Upload ke Puter.js dan dapatkan URL
  // Untuk sementara, simpan sebagai base64 data URL atau placeholder
  const attachment = {
    fileName: req.file.originalname,
    fileUrl: `placeholder://${workspace._id}/${taskId}/${req.file.originalname}`,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    uploadedBy: userId,
    uploadedAt: new Date(),
  };

  task.attachments.push(attachment);
  await task.save();

  const savedAttachment = task.attachments[task.attachments.length - 1];

  emitTaskEvent(workspace._id.toString(), "task:updated", {
    taskId: task._id,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.attachment_added",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
    details: { field: "attachment", newValue: req.file.originalname },
  });

  res.status(201).json({
    status: "success",
    data: { attachment: savedAttachment },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/tasks/:taskId/attachments/:attachmentId
// ──────────────────────────────────────────────
exports.deleteAttachment = catchAsync(async (req, res, next) => {
  const { taskId, attachmentId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    workspaceId: workspace._id,
  });

  if (!task) {
    return next(new AppError("Task tidak ditemukan", 404));
  }

  // Visibility divisi multi-divisi
  await assertCanViewTask({
    task,
    workspaceId: workspace._id,
    userId,
    role: req.workspaceMember?.role,
  });

  const attachmentIndex = task.attachments.findIndex(
    (a) => a._id.toString() === attachmentId,
  );

  if (attachmentIndex === -1) {
    return next(new AppError("Lampiran tidak ditemukan", 404));
  }

  // TODO: Hapus file dari Puter.js
  // const attachment = task.attachments[attachmentIndex];
  // await puterService.deleteFile(attachment.fileUrl);

  task.attachments.splice(attachmentIndex, 1);
  await task.save();

  emitTaskEvent(workspace._id.toString(), "task:updated", {
    taskId: task._id,
    userId,
  });

  // Activity log
  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "task.attachment_removed",
    targetType: "task",
    targetId: task._id,
    targetName: task.title,
  });

  res.status(200).json({
    status: "success",
    message: "Lampiran berhasil dihapus",
  });
});
