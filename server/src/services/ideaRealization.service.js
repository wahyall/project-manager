const Idea = require("../models/Idea");
const Event = require("../models/Event");
const ActivityLogService = require("./activityLog.service");

// Helper: ambil instance Socket.io dengan aman
const getIO = () => {
  try {
    return require("../config/socket").getIO();
  } catch {
    return null;
  }
};

/**
 * Hitung ulang status realisasi untuk sekumpulan ide.
 *
 * Ini satu-satunya tempat status "direalisasi" ditentukan. Jangan
 * menulis status itu dari controller mana pun.
 *
 * Bersifat idempoten: memanggil dua kali dengan kondisi sama tidak
 * mengubah apa pun pada panggilan kedua.
 *
 * @returns {Promise<Array<{ideaId: string, from: string, to: string, title: string}>>}
 *          hanya ide yang statusnya berubah
 */
const syncRealizationStatus = async ({
  ideaIds = [],
  workspaceId,
  actorId = null,
}) => {
  const unique = [...new Set((ideaIds || []).map((i) => String(i)))];
  if (unique.length === 0) return [];

  const changes = [];

  for (const ideaId of unique) {
    const idea = await Idea.findOne({ _id: ideaId, workspaceId });
    if (!idea) continue;

    // countDocuments melewati hook pre(/^find/) Event (nama middleware-nya
    // "countDocuments", bukan awalan "find"), jadi isDeleted harus disaring
    // manual di sini. Tanpa ini, Event yang sudah dihapus tetap terhitung
    // dan ide tidak akan pernah turun status.
    const linkedCount = await Event.countDocuments({
      workspaceId,
      ideas: idea._id,
      isDeleted: { $ne: true },
    });

    let from = idea.status;
    let to = null;

    if (linkedCount > 0 && idea.status !== "direalisasi") {
      idea.statusBeforeRealized = idea.status;
      idea.status = "direalisasi";
      to = "direalisasi";
    } else if (linkedCount === 0 && idea.status === "direalisasi") {
      idea.status = idea.statusBeforeRealized || "baru";
      idea.statusBeforeRealized = null;
      to = idea.status;
    }

    if (!to) continue;

    await idea.save();
    changes.push({
      ideaId: idea._id.toString(),
      title: idea.title,
      from,
      to,
    });

    const io = getIO();
    if (io) {
      io.to(`workspace:${workspaceId}`).emit("idea:updated", {
        idea: {
          _id: idea._id,
          status: idea.status,
          statusBeforeRealized: idea.statusBeforeRealized,
        },
        userId: actorId,
        partial: true,
      });
    }

    ActivityLogService.log({
      workspaceId,
      actorId,
      action: "idea.status_changed",
      targetType: "idea",
      targetId: idea._id,
      targetName: idea.title,
      details: { field: "status", newValue: idea.status },
    });
  }

  return changes;
};

module.exports = { syncRealizationStatus };
