const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ["task", "spreadsheet_cell", "brainstorming_widget"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    mentions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        name: String,
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    reactions: [
      {
        emoji: String,
        users: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  },
);

// ── Indexes ─────────────────────────────────────────
// Query for comments on a specific target (task/cell/widget)
commentSchema.index({ targetType: 1, targetId: 1, createdAt: 1 });
// Query for workspace activity
commentSchema.index({ workspaceId: 1, createdAt: -1 });
// Query for replies
commentSchema.index({ parentCommentId: 1 });

module.exports = mongoose.model("Comment", commentSchema);
