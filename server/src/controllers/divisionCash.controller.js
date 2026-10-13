const mongoose = require("mongoose");
const DivisionCashTransaction = require("../models/DivisionCashTransaction");
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
    throw new AppError("Kamu tidak memiliki akses ke data kas divisi ini", 403);
  }
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/divisions/:divisionId/cash
// Query: month (1-12), year (e.g. 2026), search
// ──────────────────────────────────────────────
exports.getCashSummaryAndList = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId } = req.params;
  const { month, year, search } = req.query;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  // 1. Hitung total saldo kumulatif seluruh waktu untuk divisi ini
  const allTransactions = await DivisionCashTransaction.find({
    workspaceId,
    divisionId,
  }).select("type amount");

  let totalIncomeAllTime = 0;
  let totalExpenseAllTime = 0;
  for (const t of allTransactions) {
    if (t.type === "income") totalIncomeAllTime += t.amount;
    else if (t.type === "expense") totalExpenseAllTime += t.amount;
  }
  const totalBalance = totalIncomeAllTime - totalExpenseAllTime;

  // 2. Filter per bulan & tahun terpilih jika diberikan
  const filter = { workspaceId, divisionId };
  let selectedMonth = month ? parseInt(month) : new Date().getMonth() + 1;
  let selectedYear = year ? parseInt(year) : new Date().getFullYear();

  const startDate = new Date(selectedYear, selectedMonth - 1, 1);
  const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
  filter.date = { $gte: startDate, $lte: endDate };

  if (search && search.trim()) {
    filter.$or = [
      { description: { $regex: search.trim(), $options: "i" } },
      { category: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const transactions = await DivisionCashTransaction.find(filter)
    .populate("createdBy", "name email avatar")
    .sort({ date: -1, createdAt: -1 })
    .lean();

  let monthIncome = 0;
  let monthExpense = 0;
  for (const t of transactions) {
    if (t.type === "income") monthIncome += t.amount;
    else if (t.type === "expense") monthExpense += t.amount;
  }

  res.status(200).json({
    status: "success",
    data: {
      summary: {
        totalBalance,
        monthIncome,
        monthExpense,
        monthBalance: monthIncome - monthExpense,
        selectedMonth,
        selectedYear,
      },
      transactions,
    },
  });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/divisions/:divisionId/cash
// Body: { type, amount, category, date, description, receiptUrl }
// ──────────────────────────────────────────────
exports.createTransaction = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId } = req.params;
  const { type, amount, category, date, description, receiptUrl } = req.body;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  if (!type || !["income", "expense"].includes(type)) {
    return next(new AppError("Tipe transaksi harus 'income' atau 'expense'", 400));
  }
  if (amount === undefined || amount === null || Number(amount) <= 0) {
    return next(new AppError("Nominal transaksi harus lebih dari 0", 400));
  }
  if (!category || !category.trim()) {
    return next(new AppError("Kategori transaksi harus diisi", 400));
  }
  if (!description || !description.trim()) {
    return next(new AppError("Keterangan transaksi harus diisi", 400));
  }

  const transaction = await DivisionCashTransaction.create({
    workspaceId,
    divisionId,
    type,
    amount: Number(amount),
    category: category.trim(),
    date: date ? new Date(date) : new Date(),
    description: description.trim(),
    receiptUrl: receiptUrl || null,
    createdBy: userId,
  });

  const populated = await DivisionCashTransaction.findById(transaction._id)
    .populate("createdBy", "name email avatar")
    .lean();

  ActivityLogService.log({
    workspaceId,
    actorId: userId,
    action: "division.cash_created",
    targetType: "division",
    targetId: divisionId,
    targetName: description.trim(),
    details: { type, amount: Number(amount), category: category.trim() },
  });

  res.status(201).json({
    status: "success",
    data: { transaction: populated },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/divisions/:divisionId/cash/:transactionId
// ──────────────────────────────────────────────
exports.updateTransaction = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId, transactionId } = req.params;
  const { type, amount, category, date, description, receiptUrl } = req.body;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const transaction = await DivisionCashTransaction.findOne({
    _id: transactionId,
    divisionId,
    workspaceId,
  });

  if (!transaction) {
    return next(new AppError("Transaksi kas tidak ditemukan", 404));
  }

  if (type) transaction.type = type;
  if (amount !== undefined) transaction.amount = Number(amount);
  if (category) transaction.category = category.trim();
  if (date) transaction.date = new Date(date);
  if (description) transaction.description = description.trim();
  if (receiptUrl !== undefined) transaction.receiptUrl = receiptUrl;

  await transaction.save();

  const populated = await DivisionCashTransaction.findById(transaction._id)
    .populate("createdBy", "name email avatar")
    .lean();

  res.status(200).json({
    status: "success",
    data: { transaction: populated },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/divisions/:divisionId/cash/:transactionId
// ──────────────────────────────────────────────
exports.deleteTransaction = catchAsync(async (req, res, next) => {
  const { id: workspaceId, divisionId, transactionId } = req.params;
  const userId = req.user.id;
  const role = req.workspaceMember?.role;

  await assertDivisionMemberOrAdmin({ divisionId, workspaceId, userId, role });

  const transaction = await DivisionCashTransaction.findOneAndDelete({
    _id: transactionId,
    divisionId,
    workspaceId,
  });

  if (!transaction) {
    return next(new AppError("Transaksi kas tidak ditemukan", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Transaksi kas berhasil dihapus",
  });
});
