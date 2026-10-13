const DivisionIssue = require("../models/DivisionIssue");
const WorkspaceDivision = require("../models/WorkspaceDivision");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const ActivityLogService = require("../services/activityLog.service");
const NotificationService = require("../services/notification.service");
const { isUnrestricted, getUserDivisionIds } = require("../utils/divisionScope");

const assertDivisionMemberOrAdmin = async ({ divisionId, workspaceId, userId, role }) => {
  if (isUnrestricted(role)) return;
  const userDivIds = await getUserDivisionIds(workspaceId, userId);
  if (!userDivIds.includes(divisionId.toString())) {
    throw new AppError("Kamu tidak memiliki akses ke divisi ini", 403);
  }
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/divisions/:divisionId/issues
// Query: type, status, month, year
// ──────────────────────────────────────────────
exports.listIssues = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId } = req.params;
  const { type, status, month, year } = req.query;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  // Query kendala internal divisi ini ATAU permintaan bantuan yang mengarah ke divisi ini
  const filter = {
    workspaceId,
    $or: [{ divisionId }, { targetDivisionId: divisionId }],
  };

  if (type) filter.type = type;
  if (status) filter.status = status;
  if (month) filter.month = parseInt(month);
  if (year) filter.year = parseInt(year);

  const issues = await DivisionIssue.find(filter)
    .populate("divisionId", "name color")
    .populate("targetDivisionId", "name color")
    .populate("picId", "name email avatar")
    .populate("targetPicId", "name email avatar")
    .populate("createdBy", "name email avatar")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    status: "success",
    data: { issues },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/divisions/:divisionId/issues
// Body: { type, targetDivisionId, title, description, picId, targetPicId, status, actionPlan, month, year }
// ──────────────────────────────────────────────
exports.createIssue = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId } = req.params;
  const {
    type,
    targetDivisionId,
    title,
    description,
    picId,
    targetPicId,
    status,
    actionPlan,
    month,
    year,
  } = req.body;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  if (!title || !title.trim()) {
    return next(new AppError("Judul kendala wajib diisi", 400));
  }

  const issue = await DivisionIssue.create({
    workspaceId,
    divisionId,
    type: type || "internal_issue",
    targetDivisionId: targetDivisionId || null,
    title: title.trim(),
    description: description ? description.trim() : "",
    picId: picId || null,
    targetPicId: targetPicId || null,
    status: status || "open",
    actionPlan: actionPlan ? actionPlan.trim() : "",
    month: month ? parseInt(month) : new Date().getMonth() + 1,
    year: year ? parseInt(year) : new Date().getFullYear(),
    createdBy: userId,
  });

  const populated = await DivisionIssue.findById(issue._id)
    .populate("divisionId", "name color")
    .populate("targetDivisionId", "name color")
    .populate("picId", "name email avatar")
    .populate("targetPicId", "name email avatar")
    .populate("createdBy", "name email avatar")
    .lean();

  ActivityLogService.log({
    workspaceId,
    actorId: userId,
    action: "division.issue_created",
    targetType: "division",
    targetId: divisionId,
    targetName: title.trim(),
    details: { type: issue.type, status: issue.status },
  });

  // Jika permohonan bantuan ke divisi lain, kirim notifikasi ke member target division
  if (issue.type === "cross_division_help" && targetDivisionId) {
    try {
      const targetDivision = await WorkspaceDivision.findById(targetDivisionId);
      if (targetDivision && targetDivision.members?.length > 0) {
        const recipientIds = targetDivision.members
          .map((m) => m.userId.toString())
          .filter((id) => id !== userId.toString());

        if (recipientIds.length > 0) {
          await NotificationService.createForMany({
            workspaceId,
            recipientIds,
            actorId: userId,
            type: "task_update",
            targetType: "division",
            targetId: divisionId,
            message: `${req.user.name} meminta bantuan koordinasi: "${title.trim()}"`,
            url: `/workspace/${workspaceId}/divisions/${targetDivisionId}`,
          });
        }
      }
    } catch (notifErr) {
      console.error("[DivisionIssue] Failed to send cross-division notification:", notifErr);
    }
  }

  res.status(201).json({
    status: "success",
    data: { issue: populated },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/divisions/:divisionId/issues/:issueId
// ──────────────────────────────────────────────
exports.updateIssue = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId, issueId } = req.params;
  const {
    type,
    targetDivisionId,
    title,
    description,
    picId,
    targetPicId,
    status,
    actionPlan,
    month,
    year,
  } = req.body;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const issue = await DivisionIssue.findOne({
    _id: issueId,
    workspaceId,
    $or: [{ divisionId }, { targetDivisionId: divisionId }],
  });

  if (!issue) {
    return next(new AppError("Data kendala tidak ditemukan", 404));
  }

  if (type !== undefined) issue.type = type;
  if (targetDivisionId !== undefined) issue.targetDivisionId = targetDivisionId || null;
  if (title !== undefined) issue.title = title.trim();
  if (description !== undefined) issue.description = description.trim();
  if (picId !== undefined) issue.picId = picId || null;
  if (targetPicId !== undefined) issue.targetPicId = targetPicId || null;
  if (status !== undefined) issue.status = status;
  if (actionPlan !== undefined) issue.actionPlan = actionPlan.trim();
  if (month !== undefined) issue.month = parseInt(month);
  if (year !== undefined) issue.year = parseInt(year);

  await issue.save();

  const populated = await DivisionIssue.findById(issue._id)
    .populate("divisionId", "name color")
    .populate("targetDivisionId", "name color")
    .populate("picId", "name email avatar")
    .populate("targetPicId", "name email avatar")
    .populate("createdBy", "name email avatar")
    .lean();

  res.status(200).json({
    status: "success",
    data: { issue: populated },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/divisions/:divisionId/issues/:issueId
// ──────────────────────────────────────────────
exports.deleteIssue = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId, issueId } = req.params;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const issue = await DivisionIssue.findOneAndDelete({
    _id: issueId,
    workspaceId,
    divisionId,
  });

  if (!issue) {
    return next(new AppError("Data kendala tidak ditemukan", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Kendala berhasil dihapus",
  });
});
