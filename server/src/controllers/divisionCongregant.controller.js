const DivisionCongregant = require("../models/DivisionCongregant");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const ActivityLogService = require("../services/activityLog.service");
const { isUnrestricted, getUserDivisionIds } = require("../utils/divisionScope");

const assertDivisionMemberOrAdmin = async ({ divisionId, workspaceId, userId, role }) => {
  if (isUnrestricted(role)) return;
  const userDivIds = await getUserDivisionIds(workspaceId, userId);
  if (!userDivIds.includes(divisionId.toString())) {
    throw new AppError("Kamu tidak memiliki akses ke data jamaah divisi ini", 403);
  }
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/divisions/:divisionId/congregants
// Query: search, category
// ──────────────────────────────────────────────
exports.listCongregants = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId } = req.params;
  const { search, category } = req.query;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const filter = { workspaceId, divisionId };

  if (category && category !== "all") {
    filter.category = category;
  }

  if (search && search.trim()) {
    filter.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { phone: { $regex: search.trim(), $options: "i" } },
      { address: { $regex: search.trim(), $options: "i" } },
      { notes: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const congregants = await DivisionCongregant.find(filter)
    .populate("createdBy", "name email")
    .sort({ name: 1 })
    .lean();

  const totalCount = await DivisionCongregant.countDocuments({ workspaceId, divisionId });

  res.status(200).json({
    status: "success",
    data: {
      totalCount,
      congregants,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/divisions/:divisionId/congregants
// Body: { name, phone, address, category, notes, lastVisitedAt }
// ──────────────────────────────────────────────
exports.createCongregant = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId } = req.params;
  const { name, phone, address, category, notes, lastVisitedAt } = req.body;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  if (!name || !name.trim()) {
    return next(new AppError("Nama jamaah wajib diisi", 400));
  }

  const congregant = await DivisionCongregant.create({
    workspaceId,
    divisionId,
    name: name.trim(),
    phone: phone ? phone.trim() : "",
    address: address ? address.trim() : "",
    category: category || "jamaah_rutin",
    notes: notes ? notes.trim() : "",
    lastVisitedAt: lastVisitedAt ? new Date(lastVisitedAt) : null,
    createdBy: userId,
  });

  const populated = await DivisionCongregant.findById(congregant._id)
    .populate("createdBy", "name email")
    .lean();

  ActivityLogService.log({
    workspaceId,
    actorId: userId,
    action: "division.congregant_created",
    targetType: "division",
    targetId: divisionId,
    targetName: name.trim(),
    details: { category: category || "jamaah_rutin", phone },
  });

  res.status(201).json({
    status: "success",
    data: { congregant: populated },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/divisions/:divisionId/congregants/:congregantId
// ──────────────────────────────────────────────
exports.updateCongregant = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId, congregantId } = req.params;
  const { name, phone, address, category, notes, lastVisitedAt } = req.body;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const congregant = await DivisionCongregant.findOne({
    _id: congregantId,
    workspaceId,
    divisionId,
  });

  if (!congregant) {
    return next(new AppError("Data jamaah tidak ditemukan", 404));
  }

  if (name !== undefined) congregant.name = name.trim();
  if (phone !== undefined) congregant.phone = phone.trim();
  if (address !== undefined) congregant.address = address.trim();
  if (category !== undefined) congregant.category = category;
  if (notes !== undefined) congregant.notes = notes.trim();
  if (lastVisitedAt !== undefined) {
    congregant.lastVisitedAt = lastVisitedAt ? new Date(lastVisitedAt) : null;
  }

  await congregant.save();

  const populated = await DivisionCongregant.findById(congregant._id)
    .populate("createdBy", "name email")
    .lean();

  res.status(200).json({
    status: "success",
    data: { congregant: populated },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/divisions/:divisionId/congregants/:congregantId
// ──────────────────────────────────────────────
exports.deleteCongregant = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId, congregantId } = req.params;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const congregant = await DivisionCongregant.findOneAndDelete({
    _id: congregantId,
    workspaceId,
    divisionId,
  });

  if (!congregant) {
    return next(new AppError("Data jamaah tidak ditemukan", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Data jamaah berhasil dihapus",
  });
});
