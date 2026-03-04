const mongoose = require("mongoose");

const whatsappLogSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientNumber: {
      type: String,
      required: true,
    },
    notificationType: {
      type: String,
      required: true,
      enum: [
        "mention",
        "assign_task",
        "due_date",
        "new_comment",
        "new_member",
        "event_start",
        "task_update",
      ],
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    error: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
whatsappLogSchema.index({ recipientId: 1, createdAt: -1 });
whatsappLogSchema.index({ status: 1 });

// TTL Index for auto-cleanup (90 days = 90 * 24 * 60 * 60 seconds)
whatsappLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

module.exports = mongoose.model("WhatsAppLog", whatsappLogSchema);
