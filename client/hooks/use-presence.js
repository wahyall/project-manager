"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

/**
 * Hook to track online presence of workspace members
 *
 * @param {string} workspaceId - Current workspace ID
 * @returns {{ onlineUsers: Set<string>, isUserOnline: (userId: string) => boolean }}
 */
export function usePresence(workspaceId) {
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const heartbeatRef = useRef(null);

  // Check if a specific user is online
  const isUserOnline = useCallback(
    (userId) => onlineUsers.has(userId),
    [onlineUsers],
  );

  useEffect(() => {
    if (!workspaceId) return;

    const socket = getSocket();
    if (!socket) return;

    // Join workspace & request current online members
    socket.emit("workspace:join", workspaceId);
    socket.emit("presence:members", workspaceId);

    // Handle receiving list of online members
    const handleMembers = (members) => {
      const ids = new Set(members.map((m) => m.userId));
      setOnlineUsers(ids);
    };

    // Handle user coming online
    const handleOnline = ({ userId, workspaceId: wsId }) => {
      if (wsId === workspaceId) {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.add(userId);
          return next;
        });
      }
    };

    // Handle user going offline
    const handleOffline = ({ userId, workspaceId: wsId }) => {
      if (wsId === workspaceId) {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    };

    socket.on("presence:members", handleMembers);
    socket.on("user:online", handleOnline);
    socket.on("user:offline", handleOffline);

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      socket.emit("presence:heartbeat", { workspaceId });
    }, HEARTBEAT_INTERVAL);

    return () => {
      socket.off("presence:members", handleMembers);
      socket.off("user:online", handleOnline);
      socket.off("user:offline", handleOffline);

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [workspaceId]);

  return { onlineUsers, isUserOnline };
}

