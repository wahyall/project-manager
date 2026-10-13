const WorkspaceDivision = require("../models/WorkspaceDivision");
const WorkspaceMember = require("../models/WorkspaceMember");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const ActivityLogService = require("../services/activityLog.service");
const NotificationService = require("../services/notification.service");
const EmbeddingService = require("../services/embedding.service");
const googleSheetsService = require("../services/googleSheets.service");
const DivisionCashTransaction = require("../models/DivisionCashTransaction");
const DivisionInfaqRecord = require("../models/DivisionInfaqRecord");
const DivisionCongregant = require("../models/DivisionCongregant");

const getIO = () => {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
};

const emitToWorkspace = (workspaceId, event, data) => {
  const io = getIO();
  if (io) {
    io.to(`workspace:${workspaceId}`).emit(event, data);
  }
};

const populateDivision = (query) => {
  return query
    .populate("members.userId", "name email avatar")
    .populate("createdBy", "name email avatar");
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/divisions
// ──────────────────────────────────────────────
exports.listDivisions = catchAsync(async (req, res) => {
  const workspace = req.workspace;

  const divisions = await populateDivision(
    WorkspaceDivision.find({ workspaceId: workspace._id }),
  )
    .sort({ order: 1, createdAt: 1 })
    .lean();

  res.status(200).json({
    status: "success",
    data: { divisions },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/divisions
// Body: { name, color, description? }
// ──────────────────────────────────────────────
exports.createDivision = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const userId = req.user.id;

  const { name, description, color, order } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError("Nama divisi harus diisi", 400));
  }

  const maxOrder = await WorkspaceDivision.findOne({
    workspaceId: workspace._id,
  })
    .sort({ order: -1 })
    .select("order")
    .lean();

  const division = await WorkspaceDivision.create({
    workspaceId: workspace._id,
    name: name.trim(),
    description: (description || "").trim(),
    color: color || null,
    members: [],
    order: order !== undefined ? order : (maxOrder?.order ?? -1) + 1,
    createdBy: userId,
  });

  const populated = await populateDivision(
    WorkspaceDivision.findById(division._id),
  ).lean();

  emitToWorkspace(workspace._id.toString(), "workspace:division:created", {
    division: populated,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "workspace_division.created",
    targetType: "workspace",
    targetId: workspace._id,
    targetName: workspace.name,
    details: { field: "division", newValue: division.name },
  });

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "workspace_division",
    sourceId: division._id,
    content: EmbeddingService._buildWorkspaceDivisionContent(populated),
    metadata: {
      title: division.name,
      sourceUrl: `/workspace/${workspace._id}/divisions`,
    },
  }).catch(() => {});

  res.status(201).json({
    status: "success",
    data: { division: populated },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/divisions/:divisionId
// ──────────────────────────────────────────────
exports.updateDivision = catchAsync(async (req, res, next) => {
  const { divisionId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const division = await WorkspaceDivision.findOne({
    _id: divisionId,
    workspaceId: workspace._id,
  });
  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  const { name, description, color, order } = req.body;

  if (name !== undefined) {
    if (!name.trim()) {
      return next(new AppError("Nama divisi tidak boleh kosong", 400));
    }
    division.name = name.trim();
  }
  if (description !== undefined) {
    division.description = description.trim();
  }
  if (color !== undefined) {
    division.color = color;
  }
  if (order !== undefined) {
    division.order = order;
  }

  await division.save();

  const populated = await populateDivision(
    WorkspaceDivision.findById(division._id),
  ).lean();

  emitToWorkspace(workspace._id.toString(), "workspace:division:updated", {
    division: populated,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "workspace_division.updated",
    targetType: "workspace",
    targetId: workspace._id,
    targetName: workspace.name,
    details: { field: "division", newValue: division.name },
  });

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "workspace_division",
    sourceId: division._id,
    content: EmbeddingService._buildWorkspaceDivisionContent(populated),
    metadata: {
      title: division.name,
      sourceUrl: `/workspace/${workspace._id}/divisions`,
    },
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    data: { division: populated },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/divisions/:divisionId
// ──────────────────────────────────────────────
exports.deleteDivision = catchAsync(async (req, res, next) => {
  const { divisionId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const division = await WorkspaceDivision.findOne({
    _id: divisionId,
    workspaceId: workspace._id,
  });
  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  division.isDeleted = true;
  division.deletedAt = new Date();
  await division.save();

  emitToWorkspace(workspace._id.toString(), "workspace:division:deleted", {
    divisionId: division._id,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "workspace_division.deleted",
    targetType: "workspace",
    targetId: workspace._id,
    targetName: workspace.name,
    details: { field: "division", newValue: division.name },
  });

  EmbeddingService.remove({
    sourceType: "workspace_division",
    sourceId: division._id,
    workspaceId: workspace._id,
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    message: "Divisi berhasil dihapus",
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/divisions/:divisionId/members
// Body: { memberId, role? ("leader"|"member") }
// ──────────────────────────────────────────────
exports.addMember = catchAsync(async (req, res, next) => {
  const { divisionId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const division = await WorkspaceDivision.findOne({
    _id: divisionId,
    workspaceId: workspace._id,
  });
  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  const { memberId, role } = req.body;

  if (!memberId) {
    return next(new AppError("ID member harus diisi", 400));
  }

  if (role && !["leader", "member"].includes(role)) {
    return next(new AppError("Role harus 'leader' atau 'member'", 400));
  }

  const membership = await WorkspaceMember.findMembership(
    workspace._id,
    memberId,
  );
  if (!membership) {
    return next(new AppError("User bukan member workspace ini", 400));
  }

  const alreadyInDivision = division.members.some(
    (m) => m.userId.toString() === memberId,
  );
  if (alreadyInDivision) {
    return next(new AppError("User sudah menjadi anggota divisi ini", 400));
  }

  division.members.push({
    userId: memberId,
    role: role || "member",
  });
  await division.save();

  const populated = await populateDivision(
    WorkspaceDivision.findById(division._id),
  ).lean();

  const addedMember = populated.members.find(
    (m) => (m.userId?._id || m.userId).toString() === memberId,
  );

  emitToWorkspace(workspace._id.toString(), "workspace:division:member:added", {
    divisionId: division._id,
    member: addedMember,
    division: populated,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "workspace_division.member_added",
    targetType: "workspace",
    targetId: workspace._id,
    targetName: workspace.name,
    details: {
      field: "division_member",
      newValue: `${addedMember?.userId?.name || memberId} → ${division.name}`,
    },
  });

  if (memberId !== userId) {
    await NotificationService.create({
      workspaceId: workspace._id,
      recipientId: memberId,
      actorId: userId,
      type: "assign_task",
      targetType: "workspace",
      targetId: workspace._id,
      message: `Menambahkan kamu ke Divisi Workspace "${division.name}"`,
      url: `/workspace/${workspace._id}/divisions`,
    });
  }

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "workspace_division",
    sourceId: division._id,
    content: EmbeddingService._buildWorkspaceDivisionContent(populated),
    metadata: {
      title: division.name,
      sourceUrl: `/workspace/${workspace._id}/divisions`,
    },
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    data: { division: populated },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/divisions/:divisionId/members/:userId
// Body: { role } — assign ketua (leader) / member
// ──────────────────────────────────────────────
exports.updateMemberRole = catchAsync(async (req, res, next) => {
  const { divisionId, userId: targetUserId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const division = await WorkspaceDivision.findOne({
    _id: divisionId,
    workspaceId: workspace._id,
  });
  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  const memberEntry = division.members.find(
    (m) => m.userId.toString() === targetUserId,
  );
  if (!memberEntry) {
    return next(new AppError("User bukan anggota divisi ini", 400));
  }

  const { role } = req.body;
  if (!role || !["leader", "member"].includes(role)) {
    return next(new AppError("Role harus 'leader' atau 'member'", 400));
  }

  memberEntry.role = role;
  await division.save();

  const populated = await populateDivision(
    WorkspaceDivision.findById(division._id),
  ).lean();

  const updatedMember = populated.members.find(
    (m) => (m.userId?._id || m.userId).toString() === targetUserId,
  );

  emitToWorkspace(
    workspace._id.toString(),
    "workspace:division:member:updated",
    {
      divisionId: division._id,
      member: updatedMember,
      division: populated,
      userId,
    },
  );

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "workspace_division.member_updated",
    targetType: "workspace",
    targetId: workspace._id,
    targetName: workspace.name,
    details: {
      field: "division_member_role",
      newValue: `${updatedMember?.userId?.name || targetUserId} → ${role} di ${division.name}`,
    },
  });

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "workspace_division",
    sourceId: division._id,
    content: EmbeddingService._buildWorkspaceDivisionContent(populated),
    metadata: {
      title: division.name,
      sourceUrl: `/workspace/${workspace._id}/divisions`,
    },
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    data: { division: populated },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/divisions/:divisionId/members/:userId
// ──────────────────────────────────────────────
exports.removeMember = catchAsync(async (req, res, next) => {
  const { divisionId, userId: targetUserId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const division = await WorkspaceDivision.findOne({
    _id: divisionId,
    workspaceId: workspace._id,
  });
  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  const memberIdx = division.members.findIndex(
    (m) => m.userId.toString() === targetUserId,
  );
  if (memberIdx === -1) {
    return next(new AppError("User bukan anggota divisi ini", 400));
  }

  division.members.splice(memberIdx, 1);
  await division.save();

  const populated = await populateDivision(
    WorkspaceDivision.findById(division._id),
  ).lean();

  emitToWorkspace(
    workspace._id.toString(),
    "workspace:division:member:removed",
    {
      divisionId: division._id,
      memberId: targetUserId,
      division: populated,
      userId,
    },
  );

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "workspace_division.member_removed",
    targetType: "workspace",
    targetId: workspace._id,
    targetName: workspace.name,
    details: { field: "division_member", newValue: division.name },
  });

  if (targetUserId !== userId) {
    await NotificationService.create({
      workspaceId: workspace._id,
      recipientId: targetUserId,
      actorId: userId,
      type: "assign_task",
      targetType: "workspace",
      targetId: workspace._id,
      message: `Mengeluarkan kamu dari Divisi Workspace "${division.name}"`,
      url: `/workspace/${workspace._id}/divisions`,
    });
  }

  EmbeddingService.upsert({
    workspaceId: workspace._id,
    sourceType: "workspace_division",
    sourceId: division._id,
    content: EmbeddingService._buildWorkspaceDivisionContent(populated),
    metadata: {
      title: division.name,
      sourceUrl: `/workspace/${workspace._id}/divisions`,
    },
  }).catch(() => {});

  res.status(200).json({
    status: "success",
    data: { division: populated },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/divisions/:divisionId/members/:userId/move
// Body: { targetDivisionId }
// ──────────────────────────────────────────────
exports.moveMember = catchAsync(async (req, res, next) => {
  const { divisionId, userId: targetUserId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  const { targetDivisionId } = req.body;

  if (!targetDivisionId) {
    return next(new AppError("ID divisi tujuan harus diisi", 400));
  }

  if (divisionId === targetDivisionId) {
    return next(new AppError("Divisi asal dan tujuan sama", 400));
  }

  const [sourceDivision, targetDivision] = await Promise.all([
    WorkspaceDivision.findOne({
      _id: divisionId,
      workspaceId: workspace._id,
    }),
    WorkspaceDivision.findOne({
      _id: targetDivisionId,
      workspaceId: workspace._id,
    }),
  ]);

  if (!sourceDivision) {
    return next(new AppError("Divisi asal tidak ditemukan", 404));
  }
  if (!targetDivision) {
    return next(new AppError("Divisi tujuan tidak ditemukan", 404));
  }

  const memberIdx = sourceDivision.members.findIndex(
    (m) => m.userId.toString() === targetUserId,
  );
  if (memberIdx === -1) {
    return next(new AppError("User bukan anggota divisi asal", 400));
  }

  const alreadyInTarget = targetDivision.members.some(
    (m) => m.userId.toString() === targetUserId,
  );
  if (alreadyInTarget) {
    return next(
      new AppError("User sudah menjadi anggota divisi tujuan", 400),
    );
  }

  const memberData = sourceDivision.members[memberIdx];
  sourceDivision.members.splice(memberIdx, 1);
  targetDivision.members.push({
    userId: memberData.userId,
    role: memberData.role,
  });

  await Promise.all([sourceDivision.save(), targetDivision.save()]);

  const [populatedSource, populatedTarget] = await Promise.all([
    populateDivision(WorkspaceDivision.findById(sourceDivision._id)).lean(),
    populateDivision(WorkspaceDivision.findById(targetDivision._id)).lean(),
  ]);

  emitToWorkspace(workspace._id.toString(), "workspace:division:member:moved", {
    sourceDivisionId: sourceDivision._id,
    targetDivisionId: targetDivision._id,
    memberId: targetUserId,
    sourceDivision: populatedSource,
    targetDivision: populatedTarget,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "workspace_division.member_moved",
    targetType: "workspace",
    targetId: workspace._id,
    targetName: workspace.name,
    details: {
      field: "division_member",
      newValue: `${sourceDivision.name} → ${targetDivision.name}`,
    },
  });

  for (const div of [
    { pop: populatedSource, id: sourceDivision._id },
    { pop: populatedTarget, id: targetDivision._id },
  ]) {
    EmbeddingService.upsert({
      workspaceId: workspace._id,
      sourceType: "workspace_division",
      sourceId: div.id,
      content: EmbeddingService._buildWorkspaceDivisionContent(div.pop),
      metadata: {
        title: div.pop.name,
        sourceUrl: `/workspace/${workspace._id}/divisions`,
      },
    }).catch(() => {});
  }

  res.status(200).json({
    status: "success",
    data: {
      sourceDivision: populatedSource,
      targetDivision: populatedTarget,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/divisions/:divisionId/google-sheet
// ──────────────────────────────────────────────
exports.createDivisionGoogleSpreadsheet = catchAsync(async (req, res, next) => {
  const { divisionId } = req.params;
  const workspace = req.workspace;

  const division = await WorkspaceDivision.findOne({
    _id: divisionId,
    workspaceId: workspace._id,
  });

  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  if (division.googleSpreadsheetUrl) {
    return res.status(200).json({
      status: "success",
      data: {
        googleSpreadsheetId: division.googleSpreadsheetId,
        googleSpreadsheetUrl: division.googleSpreadsheetUrl,
      },
    });
  }

  const sheetTitle = workspace?.name
    ? `${workspace.name} - Divisi ${division.name}`
    : `Divisi ${division.name}`;

  const sheetResult = await googleSheetsService.createDivisionSpreadsheet(sheetTitle);
  division.googleSpreadsheetId = sheetResult.spreadsheetId;
  division.googleSpreadsheetUrl = sheetResult.spreadsheetUrl;
  await division.save();

  res.status(201).json({
    status: "success",
    data: {
      googleSpreadsheetId: division.googleSpreadsheetId,
      googleSpreadsheetUrl: division.googleSpreadsheetUrl,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/divisions/:divisionId/google-sheet/sync
// ──────────────────────────────────────────────
exports.syncDivisionGoogleSpreadsheet = catchAsync(async (req, res, next) => {
  const { divisionId } = req.params;
  const workspace = req.workspace;

  const division = await WorkspaceDivision.findOne({
    _id: divisionId,
    workspaceId: workspace._id,
  });

  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  if (!division.googleSpreadsheetId) {
    return next(
      new AppError("Google Spreadsheet belum dibuat untuk divisi ini", 400)
    );
  }

  const [transactions, rawInfaq, congregants] = await Promise.all([
    DivisionCashTransaction.find({
      workspaceId: workspace._id,
      divisionId,
    })
      .populate("createdBy", "name")
      .sort({ date: 1 })
      .lean(),
    DivisionInfaqRecord.find({
      workspaceId: workspace._id,
      divisionId,
    })
      .populate("memberUserId", "name")
      .lean(),
    DivisionCongregant.find({
      workspaceId: workspace._id,
      divisionId,
    })
      .sort({ name: 1 })
      .lean(),
  ]);

  const infaqRecords = rawInfaq.map((r) => ({
    ...r,
    member: r.memberUserId,
  }));

  const syncResult = await googleSheetsService.syncDivisionDataToSheet(
    division.googleSpreadsheetId,
    { transactions, infaqRecords, congregants }
  );

  res.status(200).json({
    status: "success",
    message: "Data divisi berhasil disinkronkan ke Google Spreadsheet",
    data: syncResult,
  });
});

