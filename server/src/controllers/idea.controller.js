const mongoose = require("mongoose");
const Idea = require("../models/Idea");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const ActivityLogService = require("../services/activityLog.service");
const NotificationService = require("../services/notification.service");
const EmbeddingService = require("../services/embedding.service");

const IDEA_STATUSES = ["baru", "dipertimbangkan", "direalisasi", "diarsipkan"];

// Helper: ambil instance Socket.io dengan aman
const getIO = () => {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
};

// Helper: siarkan ke room workspace
const emitIdeaEvent = (workspaceId, event, data) => {
  const io = getIO();
  if (io) {
    io.to(`workspace:${workspaceId}`).emit(event, data);
  }
};

// Helper: populate field relasi
const populateIdea = (query) => {
  return query
    .populate("createdBy", "name email avatar")
    .populate("labels", "name color");
};

// Helper: bentuk balikan ke klien.
// Array votes mentah tidak pernah dikirim, hanya jumlah dan status user ini.
const shapeIdea = (idea, userId, extra = {}) => {
  const votes = Array.isArray(idea.votes) ? idea.votes : [];
  const { votes: _omit, ...rest } = idea;
  return {
    ...rest,
    voteCount: votes.length,
    hasVoted: votes.some((v) => v.toString() === userId.toString()),
    eventCount: extra.eventCount ?? 0,
    commentCount: extra.commentCount ?? 0,
  };
};

// Helper: sinkronisasi embedding, fire-and-forget seperti entity lain
const syncIdeaEmbedding = (workspaceId, idea) => {
  EmbeddingService.upsert({
    workspaceId,
    sourceType: "idea",
    sourceId: idea._id,
    content: EmbeddingService._buildIdeaContent(idea),
    metadata: {
      title: idea.title,
      status: idea.status,
      sourceUrl: `/workspace/${workspaceId}/ideas/${idea._id}`,
    },
  }).catch(() => {});
};

// Helper: kirim notifikasi mention dari deskripsi BlockNote.
// Hanya mention yang benar-benar baru yang dinotifikasi.
const notifyMentions = async ({
  workspaceId,
  ideaId,
  ideaTitle,
  actorId,
  newDescription,
  oldDescription = null,
}) => {
  try {
    const parseMentions = (raw) => {
      if (!raw) return [];
      const obj = JSON.parse(raw);
      return Array.isArray(obj?.mentions)
        ? obj.mentions.map((m) => m.userId.toString())
        : [];
    };

    const next = parseMentions(newDescription);
    const prev = parseMentions(oldDescription);
    const fresh = next.filter((uid) => !prev.includes(uid));

    if (fresh.length === 0) return;

    await NotificationService.createForMany({
      workspaceId,
      recipientIds: fresh,
      actorId,
      type: "mention",
      targetType: "idea",
      targetId: ideaId,
      message: `menyebut kamu di deskripsi ide "${ideaTitle}"`,
      url: `/workspace/${workspaceId}/ideas/${ideaId}`,
    });
  } catch {
    // Deskripsi bukan JSON valid, abaikan
  }
};

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/ideas — Daftar ide
// ──────────────────────────────────────────────
exports.listIdeas = catchAsync(async (req, res) => {
  const workspace = req.workspace;
  const userId = req.user.id;
  const {
    status,
    labels,
    keyword,
    createdBy,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 50,
  } = req.query;

  const filter = { workspaceId: workspace._id };

  if (status) {
    const values = status.split(",").filter((s) => IDEA_STATUSES.includes(s));
    if (values.length > 0) filter.status = { $in: values };
  }

  if (labels) {
    const ids = labels
      .split(",")
      .filter((l) => mongoose.Types.ObjectId.isValid(l));
    if (ids.length > 0) filter.labels = { $in: ids };
  }

  if (keyword) {
    filter.title = { $regex: keyword, $options: "i" };
  }

  if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
    filter.createdBy = createdBy;
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;
  const direction = sortOrder === "asc" ? 1 : -1;

  let ideas;
  let total;

  if (sortBy === "voteCount") {
    // voteCount tidak tersimpan, jadi dihitung lewat aggregation.
    // Catatan: aggregate melewati hook pre-find, jadi isDeleted
    // harus disaring manual di $match.
    const raw = await Idea.aggregate([
      { $match: { ...filter, isDeleted: { $ne: true } } },
      { $addFields: { voteCountSort: { $size: { $ifNull: ["$votes", []] } } } },
      { $sort: { voteCountSort: direction, createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ]);
    ideas = await Idea.populate(raw, [
      { path: "createdBy", select: "name email avatar" },
      { path: "labels", select: "name color" },
    ]);
    total = await Idea.countDocuments(filter);
  } else {
    const allowed = ["createdAt", "title"];
    const field = allowed.includes(sortBy) ? sortBy : "createdAt";
    [ideas, total] = await Promise.all([
      populateIdea(Idea.find(filter))
        .sort({ [field]: direction })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Idea.countDocuments(filter),
    ]);
  }

  res.status(200).json({
    status: "success",
    data: {
      ideas: ideas.map((i) => shapeIdea(i, userId)),
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
// POST /api/workspaces/:id/ideas — Buat ide
// ──────────────────────────────────────────────
exports.createIdea = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const userId = req.user.id;
  const { title, description } = req.body;

  if (!title || !title.trim()) {
    return next(new AppError("Judul ide harus diisi", 400));
  }

  const idea = await Idea.create({
    workspaceId: workspace._id,
    title: title.trim(),
    description: description || "",
    createdBy: userId,
  });

  const populated = await populateIdea(Idea.findById(idea._id)).lean();
  const shaped = shapeIdea(populated, userId);

  emitIdeaEvent(workspace._id.toString(), "idea:created", {
    idea: shaped,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "idea.created",
    targetType: "idea",
    targetId: idea._id,
    targetName: idea.title,
  });

  await notifyMentions({
    workspaceId: workspace._id,
    ideaId: idea._id,
    ideaTitle: idea.title,
    actorId: userId,
    newDescription: description,
  });

  syncIdeaEmbedding(workspace._id, populated);

  res.status(201).json({ status: "success", data: { idea: shaped } });
});

// ──────────────────────────────────────────────
// GET /api/workspaces/:id/ideas/:ideaId — Detail
// ──────────────────────────────────────────────
exports.getIdea = catchAsync(async (req, res, next) => {
  const { ideaId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(ideaId)) {
    return next(new AppError("Ide tidak ditemukan", 404));
  }

  const idea = await populateIdea(
    Idea.findOne({ _id: ideaId, workspaceId: workspace._id }),
  ).lean();

  if (!idea) {
    return next(new AppError("Ide tidak ditemukan", 404));
  }

  // relatedEvents diisi di Tahap 2. Field-nya sudah ada sejak sekarang
  // supaya klien tidak perlu diubah dua kali.
  res.status(200).json({
    status: "success",
    data: { idea: { ...shapeIdea(idea, userId), relatedEvents: [] } },
  });
});

// ──────────────────────────────────────────────
// PUT /api/workspaces/:id/ideas/:ideaId — Ubah
// ──────────────────────────────────────────────
exports.updateIdea = catchAsync(async (req, res, next) => {
  const { ideaId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;
  const memberRole = req.workspaceMember.role;

  if (!mongoose.Types.ObjectId.isValid(ideaId)) {
    return next(new AppError("Ide tidak ditemukan", 404));
  }

  const idea = await Idea.findOne({ _id: ideaId, workspaceId: workspace._id });
  if (!idea) {
    return next(new AppError("Ide tidak ditemukan", 404));
  }

  const isCreator = idea.createdBy.toString() === userId;
  const isAdminOrOwner = ["owner", "admin"].includes(memberRole);
  if (!isCreator && !isAdminOrOwner) {
    return next(
      new AppError("Kamu tidak memiliki izin untuk mengubah ide ini", 403),
    );
  }

  const oldDescription = idea.description;
  const { title, description, status } = req.body;
  const changedFields = [];

  if (title !== undefined) {
    if (!title.trim()) {
      return next(new AppError("Judul ide tidak boleh kosong", 400));
    }
    idea.title = title.trim();
    changedFields.push("judul");
  }

  if (description !== undefined) {
    idea.description = description;
    changedFields.push("deskripsi");
  }

  const statusOnlyChange = status !== undefined && changedFields.length === 0;

  if (status !== undefined) {
    if (!IDEA_STATUSES.includes(status)) {
      return next(new AppError("Status tidak valid", 400));
    }
    // Penjaga status otomatis dipasang di Task 10, saat relasi Event ada.
    idea.status = status;
    changedFields.push("status");
  }

  await idea.save();

  const populated = await populateIdea(Idea.findById(idea._id)).lean();
  const shaped = shapeIdea(populated, userId);

  emitIdeaEvent(workspace._id.toString(), "idea:updated", {
    idea: shaped,
    userId,
  });

  if (changedFields.length > 0) {
    ActivityLogService.log({
      workspaceId: workspace._id,
      actorId: userId,
      action: statusOnlyChange ? "idea.status_changed" : "idea.updated",
      targetType: "idea",
      targetId: idea._id,
      targetName: idea.title,
      details: { field: changedFields.join(", ") },
    });
  }

  if (description !== undefined && description !== oldDescription) {
    await notifyMentions({
      workspaceId: workspace._id,
      ideaId: idea._id,
      ideaTitle: idea.title,
      actorId: userId,
      newDescription: description,
      oldDescription,
    });
  }

  syncIdeaEmbedding(workspace._id, populated);

  res.status(200).json({ status: "success", data: { idea: shaped } });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/ideas/:ideaId — Soft delete
// ──────────────────────────────────────────────
exports.deleteIdea = catchAsync(async (req, res, next) => {
  const { ideaId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;
  const memberRole = req.workspaceMember.role;

  if (!mongoose.Types.ObjectId.isValid(ideaId)) {
    return next(new AppError("Ide tidak ditemukan", 404));
  }

  const idea = await Idea.findOne({ _id: ideaId, workspaceId: workspace._id });
  if (!idea) {
    return next(new AppError("Ide tidak ditemukan", 404));
  }

  const isCreator = idea.createdBy.toString() === userId;
  const isAdminOrOwner = ["owner", "admin"].includes(memberRole);
  if (!isCreator && !isAdminOrOwner) {
    return next(
      new AppError("Kamu tidak memiliki izin untuk menghapus ide ini", 403),
    );
  }

  idea.isDeleted = true;
  idea.deletedAt = new Date();
  await idea.save();

  // Pelepasan dari Event dikerjakan di Task 10.

  emitIdeaEvent(workspace._id.toString(), "idea:deleted", {
    ideaId: idea._id,
    userId,
  });

  ActivityLogService.log({
    workspaceId: workspace._id,
    actorId: userId,
    action: "idea.deleted",
    targetType: "idea",
    targetId: idea._id,
    targetName: idea.title,
  });

  EmbeddingService.remove({
    sourceType: "idea",
    sourceId: idea._id,
    workspaceId: workspace._id,
  }).catch(() => {});

  res.status(200).json({ status: "success", message: "Ide berhasil dihapus" });
});

// ──────────────────────────────────────────────
// POST /api/workspaces/:id/ideas/:ideaId/vote — Dukung
// ──────────────────────────────────────────────
exports.voteIdea = catchAsync(async (req, res, next) => {
  const { ideaId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(ideaId)) {
    return next(new AppError("Ide tidak ditemukan", 404));
  }

  // $addToSet supaya klik ganda tidak pernah menghasilkan suara dobel
  const idea = await Idea.findOneAndUpdate(
    { _id: ideaId, workspaceId: workspace._id },
    { $addToSet: { votes: userId } },
    { new: true },
  ).lean();

  if (!idea) {
    return next(new AppError("Ide tidak ditemukan", 404));
  }

  const voteCount = idea.votes.length;

  emitIdeaEvent(workspace._id.toString(), "idea:voted", {
    ideaId: idea._id,
    voteCount,
    userId,
  });

  res.status(200).json({
    status: "success",
    data: { voteCount, hasVoted: true },
  });
});

// ──────────────────────────────────────────────
// DELETE /api/workspaces/:id/ideas/:ideaId/vote — Tarik dukungan
// ──────────────────────────────────────────────
exports.unvoteIdea = catchAsync(async (req, res, next) => {
  const { ideaId } = req.params;
  const workspace = req.workspace;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(ideaId)) {
    return next(new AppError("Ide tidak ditemukan", 404));
  }

  const idea = await Idea.findOneAndUpdate(
    { _id: ideaId, workspaceId: workspace._id },
    { $pull: { votes: userId } },
    { new: true },
  ).lean();

  if (!idea) {
    return next(new AppError("Ide tidak ditemukan", 404));
  }

  const voteCount = idea.votes.length;

  emitIdeaEvent(workspace._id.toString(), "idea:voted", {
    ideaId: idea._id,
    voteCount,
    userId,
  });

  res.status(200).json({
    status: "success",
    data: { voteCount, hasVoted: false },
  });
});
