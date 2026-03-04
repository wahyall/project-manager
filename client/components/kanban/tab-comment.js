"use client";

import { CommentThread } from "../comments/comment-thread";

export function TabComment({
  workspaceId,
  taskId,
  currentUserId,
  members = [],
}) {
  return (
    <div className="flex-1 overflow-hidden h-full">
      <CommentThread
        workspaceId={workspaceId}
        targetType="task"
        targetId={taskId}
        currentUserId={currentUserId}
        members={members}
      />
    </div>
  );
}
