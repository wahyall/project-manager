"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";

export function useComments(workspaceId, targetType, targetId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    if (!targetType || !targetId) return;
    setLoading(true);
    try {
      const { data } = await api.get("/comments", {
        params: { targetType, targetId },
      });
      setComments(data.data.comments || []);
    } catch (error) {
      console.error("[useComments] Failed to fetch:", error);
      toast.error("Gagal memuat komentar");
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  const createComment = async (
    content,
    parentCommentId = null,
    mentions = [],
  ) => {
    try {
      const { data } = await api.post("/comments", {
        workspaceId,
        targetType,
        targetId,
        content,
        parentCommentId,
        mentions,
      });
      // Komentar baru akan ditambahkan via socket event (comment:created)
      // agar konsisten dengan user lain. Tapi kita bisa optimistik atau fetch ulang.
      return data.data.comment;
    } catch (error) {
      toast.error("Gagal mengirim komentar");
      throw error;
    }
  };

  const updateComment = async (commentId, content, mentions = []) => {
    try {
      const { data } = await api.put(`/comments/${commentId}`, {
        content,
        mentions,
      });
      return data.data.comment;
    } catch (error) {
      toast.error("Gagal memperbarui komentar");
      throw error;
    }
  };

  const deleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      toast.success("Komentar dihapus");
    } catch (error) {
      toast.error("Gagal menghapus komentar");
      throw error;
    }
  };

  const addReaction = async (commentId, emoji) => {
    try {
      await api.post(`/comments/${commentId}/reactions`, { emoji });
    } catch (error) {
      toast.error("Gagal menambah reaksi");
    }
  };

  const removeReaction = async (commentId, emoji) => {
    try {
      await api.delete(`/comments/${commentId}/reactions/${emoji}`);
    } catch (error) {
      toast.error("Gagal menghapus reaksi");
    }
  };

  const resolveThread = async (commentId) => {
    try {
      await api.post(`/comments/${commentId}/resolve`);
      toast.success("Thread diselesaikan");
    } catch (error) {
      toast.error("Gagal menyelesaikan thread");
    }
  };

  const unresolveThread = async (commentId) => {
    try {
      await api.post(`/comments/${commentId}/unresolve`);
      toast.success("Thread diaktifkan kembali");
    } catch (error) {
      toast.error("Gagal mengaktifkan thread");
    }
  };

  // Socket.io listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCommentCreated = ({
      targetType: tType,
      targetId: tId,
      comment,
    }) => {
      if (tType === targetType && tId === targetId) {
        setComments((prev) => {
          if (comment.parentCommentId) {
            // Jika reply, cari parent-nya
            return prev.map((c) => {
              if (c._id === comment.parentCommentId) {
                // Tambahkan reply (hindari duplikat)
                const exists = c.replies?.some((r) => r._id === comment._id);
                if (exists) return c;
                return {
                  ...c,
                  replies: [...(c.replies || []), comment],
                };
              }
              return c;
            });
          } else {
            // Jika root comment, tambahkan ke list
            const exists = prev.some((c) => c._id === comment._id);
            if (exists) return prev;
            return [...prev, { ...comment, replies: [] }];
          }
        });
      }
    };

    const handleCommentUpdated = ({ commentId, content }) => {
      setComments((prev) =>
        prev.map((c) => {
          if (c._id === commentId) {
            return { ...c, content, isEdited: true };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r._id === commentId ? { ...r, content, isEdited: true } : r,
              ),
            };
          }
          return c;
        }),
      );
    };

    const handleCommentDeleted = ({ commentId }) => {
      setComments((prev) =>
        prev.map((c) => {
          if (c._id === commentId) {
            return {
              ...c,
              content: "_Komentar ini telah dihapus_",
              isDeleted: true,
              mentions: [],
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r._id === commentId
                  ? {
                      ...r,
                      content: "_Komentar ini telah dihapus_",
                      isDeleted: true,
                      mentions: [],
                    }
                  : r,
              ),
            };
          }
          return c;
        }),
      );
    };

    const handleReactionAdded = ({ commentId, emoji, userId }) => {
      setComments((prev) =>
        prev.map((c) => {
          const updateReactions = (reactions = []) => {
            const idx = reactions.findIndex((r) => r.emoji === emoji);
            if (idx !== -1) {
              const newReactions = [...reactions];
              if (!newReactions[idx].users.includes(userId)) {
                newReactions[idx].users = [...newReactions[idx].users, userId];
              }
              return newReactions;
            }
            return [...reactions, { emoji, users: [userId] }];
          };

          if (c._id === commentId) {
            return { ...c, reactions: updateReactions(c.reactions) };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r._id === commentId
                  ? { ...r, reactions: updateReactions(r.reactions) }
                  : r,
              ),
            };
          }
          return c;
        }),
      );
    };

    const handleReactionRemoved = ({ commentId, emoji, userId }) => {
      setComments((prev) =>
        prev.map((c) => {
          const updateReactions = (reactions = []) => {
            return reactions
              .map((r) => {
                if (r.emoji === emoji) {
                  return {
                    ...r,
                    users: r.users.filter((id) => id !== userId),
                  };
                }
                return r;
              })
              .filter((r) => r.users.length > 0);
          };

          if (c._id === commentId) {
            return { ...c, reactions: updateReactions(c.reactions) };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r._id === commentId
                  ? { ...r, reactions: updateReactions(r.reactions) }
                  : r,
              ),
            };
          }
          return c;
        }),
      );
    };

    const handleCommentResolved = ({ commentId, resolvedBy }) => {
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, isResolved: true, resolvedBy, resolvedAt: new Date() }
            : c,
        ),
      );
    };

    const handleCommentUnresolved = ({ commentId }) => {
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, isResolved: false, resolvedBy: null, resolvedAt: null }
            : c,
        ),
      );
    };

    socket.on("comment:created", handleCommentCreated);
    socket.on("comment:updated", handleCommentUpdated);
    socket.on("comment:deleted", handleCommentDeleted);
    socket.on("comment:reaction:added", handleReactionAdded);
    socket.on("comment:reaction:removed", handleReactionRemoved);
    socket.on("comment:resolved", handleCommentResolved);
    socket.on("comment:unresolved", handleCommentUnresolved);

    return () => {
      socket.off("comment:created", handleCommentCreated);
      socket.off("comment:updated", handleCommentUpdated);
      socket.off("comment:deleted", handleCommentDeleted);
      socket.off("comment:reaction:added", handleReactionAdded);
      socket.off("comment:reaction:removed", handleReactionRemoved);
      socket.off("comment:resolved", handleCommentResolved);
      socket.off("comment:unresolved", handleCommentUnresolved);
    };
  }, [targetType, targetId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    createComment,
    updateComment,
    deleteComment,
    addReaction,
    removeReaction,
    resolveThread,
    unresolveThread,
    refresh: fetchComments,
  };
}
