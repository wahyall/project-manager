const mongoose = require("mongoose");
const Task = require("../models/Task");
const Event = require("../models/Event");
const WorkspaceMember = require("../models/WorkspaceMember");
const RAGService = require("./rag.service");
const ActivityLogService = require("./activityLog.service");
const NotificationService = require("./notification.service");
const { getNextColumnOrder } = require("./task.service");

// Helper: emit task event to workspace room
const emitEvent = (workspaceId, event, data) => {
  try {
    const io = require("../config/socket").getIO();
    if (io) io.to(`workspace:${workspaceId}`).emit(event, data);
  } catch (err) {}
};

class AIActionsService {
  /**
   * Search data using RAG (Retrieval-Augmented Generation)
   */
  static async searchData({ query, workspaceId }) {
    if (!query) return "Query tidak boleh kosong.";

    // Gunakan RAG Service untuk mendapatkan potongan dokumen yang relevan
    const docs = await RAGService.retrieve(query, workspaceId, null, 15);
    if (docs.length === 0) {
      return "Tidak ditemukan data yang relevan dengan pertanyaan Anda di workspace ini.";
    }

    // Gabungkan menjadi format string yang bisa dibaca AI
    return RAGService.buildContext(docs);
  }

  /**
   * Mendapatkan summary workspace (statistik basic)
   */
  static async getWorkspaceSummary({ workspaceId }) {
    const [tasks, events, members] = await Promise.all([
      Task.find({ workspaceId, isDeleted: { $ne: true } }).select(
        "columnId priority isArchived",
      ),
      Event.find({ workspaceId, isDeleted: { $ne: true } }).select("status"),
      WorkspaceMember.countDocuments({ workspaceId }),
    ]);

    const activeTasks = tasks.filter((t) => !t.isArchived);

    return {
      totalMembers: members,
      totalActiveTasks: activeTasks.length,
      totalEvents: events.length,
      tasksByPriority: activeTasks.reduce((acc, t) => {
        acc[t.priority || "medium"] = (acc[t.priority || "medium"] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  /**
   * Membuat task baru
   */
  static async createTask({
    workspace,
    userId,
    title,
    description,
    priority,
    columnId,
  }) {
    if (!title) throw new Error("Judul task harus diisi.");

    // Gunakan columnId atau fallback ke kolom pertama di kanbanColumns
    const targetColumnId = columnId || workspace.kanbanColumns[0]?._id;
    if (!targetColumnId)
      throw new Error("Workspace tidak memiliki kolom kanban yang valid.");

    const columnOrder = await getNextColumnOrder(workspace._id, targetColumnId);

    const task = await Task.create({
      workspaceId: workspace._id,
      title: title.trim(),
      description: description || "",
      columnId: targetColumnId,
      columnOrder,
      priority: priority || "medium",
      createdBy: userId,
      watchers: [userId],
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignees", "name email avatar")
      .populate("watchers", "name email avatar")
      .populate("labels", "name color")
      .populate("createdBy", "name")
      .lean();

    emitEvent(workspace._id.toString(), "task:created", {
      task: populatedTask,
      userId,
    });

    ActivityLogService.log({
      workspaceId: workspace._id,
      actorId: userId,
      action: "task.created",
      targetType: "task",
      targetId: task._id,
      targetName: task.title,
    });

    // Embedding sync (fire-and-forget)
    require("./embedding.service")
      .upsert({
        workspaceId: workspace._id,
        sourceType: "task",
        sourceId: task._id,
        content: require("./embedding.service")._buildTaskContent(
          populatedTask,
        ),
        metadata: {
          title: task.title,
          sourceUrl: `/workspace/${workspace._id}/tasks/${task._id}`,
        },
      })
      .catch(() => {});

    return {
      success: true,
      message: `Task "${task.title}" berhasil dibuat.`,
      taskUrl: `/workspace/${workspace._id}/tasks/${task._id}`,
      task: populatedTask,
    };
  }

  /**
   * Mengupdate field task (status, prioritas, dll)
   */
  static async updateTask({ workspaceId, userId, taskId, updates }) {
    if (!taskId) throw new Error("ID Task diperlukan.");
    if (!updates || Object.keys(updates).length === 0)
      throw new Error("Tidak ada perubahan.");

    const task = await Task.findOne({ _id: taskId, workspaceId });
    if (!task) throw new Error("Task tidak ditemukan.");

    const { title, description, priority, columnId } = updates;

    let changed = false;
    let columnChanged = false;

    if (title && title !== task.title) {
      task.title = title;
      changed = true;
    }
    if (description !== undefined && description !== task.description) {
      task.description = description;
      changed = true;
    }
    if (priority && priority !== task.priority) {
      task.priority = priority;
      changed = true;
    }
    if (columnId && columnId.toString() !== task.columnId.toString()) {
      task.columnId = columnId;
      task.columnOrder = await getNextColumnOrder(workspaceId, columnId);
      columnChanged = true;
      changed = true;
    }

    if (!changed)
      return { success: true, message: "Tidak ada perubahan yang diperlukan." };

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignees", "name")
      .populate("labels", "name color")
      .lean();

    const eventName = columnChanged ? "task:moved" : "task:updated";
    emitEvent(workspaceId.toString(), eventName, {
      task: populatedTask,
      userId,
    });

    ActivityLogService.log({
      workspaceId,
      actorId: userId,
      action: "task.updated",
      targetType: "task",
      targetId: task._id,
      targetName: task.title,
      details: { field: "AI Assist Update" },
    });

    // Embedding sync (fire-and-forget)
    require("./embedding.service")
      .upsert({
        workspaceId,
        sourceType: "task",
        sourceId: task._id,
        content: require("./embedding.service")._buildTaskContent(
          populatedTask,
        ),
      })
      .catch(() => {});

    return {
      success: true,
      message: `Task "${task.title}" berhasil diupdate.`,
      task: populatedTask,
    };
  }

  /**
   * Membuat event calendar baru
   */
  static async createEvent({
    workspaceId,
    userId,
    title,
    description,
    startDate,
    endDate,
  }) {
    if (!title) throw new Error("Judul event harus diisi.");
    if (!startDate || !endDate)
      throw new Error("Tanggal mulai dan selesai harus diisi.");

    const event = await Event.create({
      workspaceId,
      title: title.trim(),
      description: description || "",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdBy: userId,
      participants: [userId],
    });

    const populatedEvent = await Event.findById(event._id)
      .populate("createdBy", "name")
      .lean();

    emitEvent(workspaceId.toString(), "event:created", {
      event: populatedEvent,
      userId,
    });

    ActivityLogService.log({
      workspaceId,
      actorId: userId,
      action: "event.created",
      targetType: "event",
      targetId: event._id,
      targetName: event.title,
    });

    require("./embedding.service")
      .upsert({
        workspaceId,
        sourceType: "event",
        sourceId: event._id,
        content: require("./embedding.service")._buildEventContent(
          populatedEvent,
        ),
      })
      .catch(() => {});

    return {
      success: true,
      message: `Event "${event.title}" berhasil dibuat.`,
      event: populatedEvent,
    };
  }

  /**
   * Assign/Unassign member dari task
   */
  static async assignMember({
    workspaceId,
    userId,
    taskId,
    memberId,
    action = "assign",
  }) {
    if (!taskId || !memberId)
      throw new Error("taskId dan memberId diperlukan.");

    const task = await Task.findOne({ _id: taskId, workspaceId });
    if (!task) throw new Error("Task tidak ditemukan.");

    const isCurrentlyAssigned = task.assignees.some(
      (a) => a.toString() === memberId,
    );

    if (action === "assign" && !isCurrentlyAssigned) {
      task.assignees.push(memberId);
    } else if (action === "unassign" && isCurrentlyAssigned) {
      task.assignees = task.assignees.filter((a) => a.toString() !== memberId);
    } else {
      return { success: true, message: `Member sudah di-${action}.` };
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignees", "name")
      .lean();
    emitEvent(workspaceId.toString(), "task:updated", {
      task: populatedTask,
      userId,
    });

    ActivityLogService.log({
      workspaceId,
      actorId: userId,
      action: "task.updated",
      targetType: "task",
      targetId: task._id,
      targetName: task.title,
      details: { field: "assignees" },
    });

    if (action === "assign" && memberId !== userId) {
      await NotificationService.create({
        workspaceId,
        recipientId: memberId,
        actorId: userId,
        type: "assign_task",
        targetType: "task",
        targetId: task._id,
        message: `Tugas ditugaskan via AI: ${task.title}`,
        url: `/workspace/${workspaceId}/tasks/${task._id}`,
      });
    }

    require("./embedding.service")
      .upsert({
        workspaceId,
        sourceType: "task",
        sourceId: task._id,
        content: require("./embedding.service")._buildTaskContent(
          populatedTask,
        ),
      })
      .catch(() => {});

    return {
      success: true,
      message: `Berhasil me-${action} member ke task "${task.title}".`,
      task: populatedTask,
    };
  }
}

module.exports = AIActionsService;
