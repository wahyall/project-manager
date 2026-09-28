"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export function usePipelineTemplates(workspaceId) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const basePath = `/workspaces/${workspaceId}/pipeline-templates`;

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(basePath);
      setTemplates(res.data.data.templates);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    if (workspaceId) fetchTemplates();
  }, [workspaceId, fetchTemplates]);

  const updateTemplate = useCallback(
    async (templateId, updates) => {
      const res = await api.put(`${basePath}/${templateId}`, updates);
      setTemplates((prev) =>
        prev.map((t) => (t._id === templateId ? res.data.data.template : t)),
      );
      return res.data.data.template;
    },
    [basePath],
  );

  const deleteTemplate = useCallback(
    async (templateId) => {
      await api.delete(`${basePath}/${templateId}`);
      setTemplates((prev) => prev.filter((t) => t._id !== templateId));
    },
    [basePath],
  );

  return { templates, loading, fetchTemplates, updateTemplate, deleteTemplate };
}
