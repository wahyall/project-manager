const DivisionInfaqRecord = require("../models/DivisionInfaqRecord");
const WorkspaceDivision = require("../models/WorkspaceDivision");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const ActivityLogService = require("../services/activityLog.service");
const { isUnrestricted, getUserDivisionIds } = require("../utils/divisionScope");

// Helper: Memastikan user adalah anggota divisi atau Owner/Admin
const assertDivisionMemberOrAdmin = async ({ divisionId, workspaceId, userId, role }) => {
  if (isUnrestricted(role)) return;
  const userDivIds = await getUserDivisionIds(workspaceId, userId);
  if (!userDivIds.includes(divisionId.toString())) {
    throw new AppError("Kamu tidak memiliki akses ke data infaq divisi ini", 403);
  }
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/divisions/:divisionId/infaq
// Query: month (1-12), year (e.g. 2026)
// ──────────────────────────────────────────────
exports.getInfaqRecords = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId } = req.params;
  const { month, year } = req.query;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const selectedMonth = month ? parseInt(month) : new Date().getMonth() + 1;
  const selectedYear = year ? parseInt(year) : new Date().getFullYear();

  // Ambil data divisi beserta member
  const division = await WorkspaceDivision.findOne({
    _id: divisionId,
    workspaceId,
  }).populate("members.userId", "name email avatar");

  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  // Ambil record infaq yang sudah tercatat di bulan & tahun ini
  const existingRecords = await DivisionInfaqRecord.find({
    workspaceId,
    divisionId,
    month: selectedMonth,
    year: selectedYear,
  })
    .populate("recordedBy", "name email")
    .lean();

  const recordMap = new Map();
  existingRecords.forEach((rec) => {
    recordMap.set(rec.memberUserId.toString(), rec);
  });

  let totalMembers = 0;
  let paidMembers = 0;
  let totalAmountCollected = 0;

  const membersInfaq = (division.members || [])
    .filter((m) => m.userId) // filter out deleted users
    .map((m) => {
      totalMembers++;
      const user = m.userId;
      const rec = recordMap.get(user._id.toString());
      const isPaid = rec ? rec.isPaid : false;
      const amount = rec ? rec.amount : 0;

      if (isPaid) {
        paidMembers++;
        totalAmountCollected += amount;
      }

      return {
        member: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          roleInDivision: m.roleInDivision,
        },
        recordId: rec ? rec._id : null,
        isPaid,
        amount,
        paymentDate: rec ? rec.paymentDate : null,
        notes: rec ? rec.notes : "",
        recordedBy: rec ? rec.recordedBy : null,
      };
    });

  res.status(200).json({
    status: "success",
    data: {
      summary: {
        totalMembers,
        paidMembers,
        unpaidMembers: totalMembers - paidMembers,
        totalAmountCollected,
        selectedMonth,
        selectedYear,
      },
      records: membersInfaq,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/divisions/:divisionId/infaq
// Body: { memberUserId, month, year, isPaid, amount, paymentDate, notes }
// ──────────────────────────────────────────────
exports.recordInfaq = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId } = req.params;
  const { memberUserId, month, year, isPaid, amount, paymentDate, notes } = req.body;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  if (!memberUserId) {
    return next(new AppError("memberUserId harus disertakan", 400));
  }

  const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
  const targetYear = year ? parseInt(year) : new Date().getFullYear();

  const record = await DivisionInfaqRecord.findOneAndUpdate(
    {
      workspaceId,
      divisionId,
      memberUserId,
      month: targetMonth,
      year: targetYear,
    },
    {
      $set: {
        isPaid: Boolean(isPaid),
        amount: Number(amount) || 0,
        paymentDate: isPaid ? (paymentDate ? new Date(paymentDate) : new Date()) : null,
        notes: notes || "",
        recordedBy: userId,
      },
    },
    { new: true, upsert: true, runValidators: true }
  ).populate("recordedBy", "name email");

  ActivityLogService.log({
    workspaceId,
    actorId: userId,
    action: "division.infaq_recorded",
    targetType: "division",
    targetId: divisionId,
    targetName: `Infaq Bulan ${targetMonth}/${targetYear}`,
    details: { memberUserId, isPaid, amount: Number(amount) || 0 },
  });

  res.status(200).json({
    status: "success",
    data: { record },
  });
});
