"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState({ active: [], archived: [] });
  const [currentWorkspace, setCurrentWorkspaceState] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

  // Fetch all workspaces
  const fetchWorkspaces = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get("/workspaces");
      setWorkspaces(data.data);
      return data.data;
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Set current workspace
  const setCurrentWorkspace = useCallback(
    async (workspaceId) => {
      if (!workspaceId) {
        setCurrentWorkspaceState(null);
        localStorage.removeItem("currentWorkspaceId");
        return;
      }

      try {
        const { data } = await api.get(`/workspaces/${workspaceId}`);
        setCurrentWorkspaceState(data.data.workspace);
        localStorage.setItem("currentWorkspaceId", workspaceId);
        return data.data.workspace;
      } catch (error) {
        console.error("Failed to load workspace:", error);
        localStorage.removeItem("currentWorkspaceId");
      }
    },
    [],
  );

  // Create workspace
  const createWorkspace = useCallback(async (workspaceData) => {
    const { data } = await api.post("/workspaces", workspaceData);
    await fetchWorkspaces();
    return data.data.workspace;
  }, [fetchWorkspaces]);

  // Update workspace
  const updateWorkspace = useCallback(
    async (workspaceId, updates) => {
      const { data } = await api.put(`/workspaces/${workspaceId}`, updates);
      if (currentWorkspace?._id === workspaceId) {
        setCurrentWorkspaceState(data.data.workspace);
      }
      await fetchWorkspaces();
      return data.data.workspace;
    },
    [currentWorkspace, fetchWorkspaces],
  );

  // Delete workspace
  const deleteWorkspace = useCallback(
    async (workspaceId) => {
      await api.delete(`/workspaces/${workspaceId}`);
      if (currentWorkspace?._id === workspaceId) {
        setCurrentWorkspaceState(null);
        localStorage.removeItem("currentWorkspaceId");
      }
      await fetchWorkspaces();
    },
    [currentWorkspace, fetchWorkspaces],
  );

  // Archive / Unarchive
  const archiveWorkspace = useCallback(
    async (workspaceId) => {
      await api.post(`/workspaces/${workspaceId}/archive`);
      await fetchWorkspaces();
    },
    [fetchWorkspaces],
  );

  const unarchiveWorkspace = useCallback(
    async (workspaceId) => {
      await api.post(`/workspaces/${workspaceId}/unarchive`);
      await fetchWorkspaces();
    },
    [fetchWorkspaces],
  );

  // Members
  const fetchMembers = useCallback(async (workspaceId) => {
    setMembersLoading(true);
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      setMembers(data.data.members);
      return data.data.members;
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const inviteMembers = useCallback(async (workspaceId, inviteData) => {
    const { data } = await api.post(
      `/workspaces/${workspaceId}/invite`,
      inviteData,
    );
    return data.data;
  }, []);

  const regenerateInviteLink = useCallback(async (workspaceId) => {
    const { data } = await api.post(
      `/workspaces/${workspaceId}/invite-link/regenerate`,
    );
    return data.data;
  }, []);

  const changeMemberRole = useCallback(
    async (workspaceId, userId, role) => {
      await api.put(`/workspaces/${workspaceId}/members/${userId}/role`, {
        role,
      });
      await fetchMembers(workspaceId);
    },
    [fetchMembers],
  );

  const removeMember = useCallback(
    async (workspaceId, userId) => {
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
      await fetchMembers(workspaceId);
    },
    [fetchMembers],
  );

  const leaveWorkspace = useCallback(
    async (workspaceId) => {
      await api.post(`/workspaces/${workspaceId}/leave`);
      if (currentWorkspace?._id === workspaceId) {
        setCurrentWorkspaceState(null);
        localStorage.removeItem("currentWorkspaceId");
      }
      await fetchWorkspaces();
    },
    [currentWorkspace, fetchWorkspaces],
  );

  const transferOwnership = useCallback(
    async (workspaceId, targetUserId) => {
      await api.post(`/workspaces/${workspaceId}/transfer-ownership`, {
        targetUserId,
      });
      await fetchMembers(workspaceId);
      await setCurrentWorkspace(workspaceId);
    },
    [fetchMembers, setCurrentWorkspace],
  );

  // Auto-fetch workspaces when user is available
  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    } else {
      setWorkspaces({ active: [], archived: [] });
      setCurrentWorkspaceState(null);
    }
  }, [user, fetchWorkspaces]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        members,
        loading,
        membersLoading,
        fetchWorkspaces,
        setCurrentWorkspace,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        archiveWorkspace,
        unarchiveWorkspace,
        fetchMembers,
        inviteMembers,
        regenerateInviteLink,
        changeMemberRole,
        removeMember,
        leaveWorkspace,
        transferOwnership,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace harus digunakan di dalam WorkspaceProvider");
  }
  return context;
}

