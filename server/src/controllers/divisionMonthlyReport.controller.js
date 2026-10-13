const DivisionMonthlyReport = require("../models/DivisionMonthlyReport");
const DivisionCashTransaction = require("../models/DivisionCashTransaction");
const DivisionInfaqRecord = require("../models/DivisionInfaqRecord");
const DivisionCongregant = require("../models/DivisionCongregant");
const DivisionIssue = require("../models/DivisionIssue");
const WorkspaceDivision = require("../models/WorkspaceDivision");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const ActivityLogService = require("../services/activityLog.service");
const { isUnrestricted, getUserDivisionIds } = require("../utils/divisionScope");

const assertDivisionMemberOrAdmin = async ({ divisionId, workspaceId, userId, role }) => {
  if (isUnrestricted(role)) return;
  const userDivIds = await getUserDivisionIds(workspaceId, userId);
  if (!userDivIds.includes(divisionId.toString())) {
    throw new AppError("Kamu tidak memiliki akses ke laporan divisi ini", 403);
  }
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/divisions/:divisionId/reports
// ──────────────────────────────────────────────
exports.listMonthlyReports = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId } = req.params;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const reports = await DivisionMonthlyReport.find({
    workspaceId,
    divisionId,
  })
    .populate("createdById", "name email avatar")
    .sort({ year: -1, month: -1 })
    .lean();

  res.status(200).json({
    status: "success",
    data: { reports },
  });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/divisions/:divisionId/reports/:reportId
// ──────────────────────────────────────────────
exports.getMonthlyReport = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId, reportId } = req.params;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const report = await DivisionMonthlyReport.findOne({
    _id: reportId,
    workspaceId,
    divisionId,
  })
    .populate("createdById", "name email avatar")
    .lean();

  if (!report) {
    return next(new AppError("Laporan bulanan tidak ditemukan", 404));
  }

  res.status(200).json({
    status: "success",
    data: { report },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/divisions/:divisionId/reports
// Body: { month, year, title, notes }
// ──────────────────────────────────────────────
exports.createMonthlyReport = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId } = req.params;
  const { month, year, title, notes } = req.body;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
  const targetYear = year ? parseInt(year) : new Date().getFullYear();

  const division = await WorkspaceDivision.findOne({ _id: divisionId, workspaceId });
  if (!division) {
    return next(new AppError("Divisi tidak ditemukan", 404));
  }

  // 1. Agregasi Kas
  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

  const monthCash = await DivisionCashTransaction.find({
    workspaceId,
    divisionId,
    date: { $gte: startDate, $lte: endDate },
  }).select("type amount");

  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of monthCash) {
    if (t.type === "income") totalIncome += t.amount;
    else if (t.type === "expense") totalExpense += t.amount;
  }

  // Saldo kumulatif hingga akhir bulan ini
  const allCashUpToMonth = await DivisionCashTransaction.find({
    workspaceId,
    divisionId,
    date: { $lte: endDate },
  }).select("type amount");

  let cumIncome = 0;
  let cumExpense = 0;
  for (const t of allCashUpToMonth) {
    if (t.type === "income") cumIncome += t.amount;
    else if (t.type === "expense") cumExpense += t.amount;
  }
  const balance = cumIncome - cumExpense;

  // 2. Agregasi Infaq
  const infaqRecords = await DivisionInfaqRecord.find({
    workspaceId,
    divisionId,
    month: targetMonth,
    year: targetYear,
  });

  let totalCollected = 0;
  let paidMembersCount = 0;
  for (const rec of infaqRecords) {
    if (rec.isPaid) {
      paidMembersCount++;
      totalCollected += rec.amount || 0;
    }
  }
  const totalMembersCount = division.members?.length || 0;

  // 3. Agregasi Jamaah
  const totalCongregants = await DivisionCongregant.countDocuments({
    workspaceId,
    divisionId,
  });

  // 4. Agregasi Kendala
  const issues = await DivisionIssue.find({
    workspaceId,
    divisionId,
    month: targetMonth,
    year: targetYear,
  });

  let openCount = 0;
  let inProgressCount = 0;
  let resolvedCount = 0;
  for (const iss of issues) {
    if (iss.status === "open") openCount++;
    else if (iss.status === "in_progress") inProgressCount++;
    else if (iss.status === "resolved") resolvedCount++;
  }

  const reportTitle =
    title && title.trim()
      ? title.trim()
      : `Laporan Bulanan ${division.name} - ${targetMonth}/${targetYear}`;

  const report = await DivisionMonthlyReport.findOneAndUpdate(
    {
      workspaceId,
      divisionId,
      month: targetMonth,
      year: targetYear,
    },
    {
      $set: {
        title: reportTitle,
        summaryCash: { totalIncome, totalExpense, balance },
        summaryInfaq: { totalCollected, paidMembersCount, totalMembersCount },
        summaryJamaah: { totalCongregants },
        summaryIssues: { openCount, inProgressCount, resolvedCount },
        notes: notes ? notes.trim() : "",
        isLocked: true,
        createdById: userId,
      },
    },
    { new: true, upsert: true, runValidators: true }
  ).populate("createdById", "name email avatar");

  ActivityLogService.log({
    workspaceId,
    actorId: userId,
    action: "division.monthly_report_created",
    targetType: "division",
    targetId: divisionId,
    targetName: reportTitle,
    details: { month: targetMonth, year: targetYear, balance },
  });

  res.status(201).json({
    status: "success",
    data: { report },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/divisions/:divisionId/reports/:reportId
// ──────────────────────────────────────────────
exports.deleteMonthlyReport = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId, reportId } = req.params;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const report = await DivisionMonthlyReport.findOneAndDelete({
    _id: reportId,
    workspaceId,
    divisionId,
  });

  if (!report) {
    return next(new AppError("Laporan bulanan tidak ditemukan", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Laporan bulanan berhasil dihapus",
  });
});
