const mongoose = require("mongoose");

const ROLES = ["owner", "admin", "member", "guest"];

const workspaceMemberSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: "Role harus salah satu dari: owner, admin, member, guest",
      },
      required: true,
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index — satu user hanya bisa jadi member sekali per workspace
workspaceMemberSchema.index(
  { workspaceId: 1, userId: 1 },
  { unique: true },
);

// Index untuk query by user (list workspaces)
workspaceMemberSchema.index({ userId: 1 });

// Index untuk query by workspace (list members)
workspaceMemberSchema.index({ workspaceId: 1 });

// Static: cek apakah user adalah member workspace
workspaceMemberSchema.statics.findMembership = async function (
  workspaceId,
  userId,
) {
  return this.findOne({ workspaceId, userId });
};

// Static: hitung jumlah member
workspaceMemberSchema.statics.countMembers = async function (workspaceId) {
  return this.countDocuments({ workspaceId });
};

// Static: get role hierarchy level (higher = more power)
workspaceMemberSchema.statics.getRoleLevel = function (role) {
  const levels = { guest: 0, member: 1, admin: 2, owner: 3 };
  return levels[role] ?? -1;
};

module.exports = mongoose.model("WorkspaceMember", workspaceMemberSchema);
module.exports.ROLES = ROLES;

