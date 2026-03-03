"use client";

import { useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

/**
 * Hook for exporting data (tasks, events) with polling for background jobs.
 */
export function useExport() {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState(null);
  const pollingRef = useRef(null);

  // ── Poll job status ───────────────────────────────
  const pollJob = useCallback(async (jobId, fileName) => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 60; // 2 min max

      pollingRef.current = setInterval(async () => {
        attempts++;
        try {
          const { data } = await api.get(`/export-jobs/${jobId}`);
          const job = data.data.job;

          if (job.status === "completed") {
            clearInterval(pollingRef.current);
            pollingRef.current = null;

            // Trigger download
            const downloadUrl = `${api.defaults.baseURL}/export-jobs/${jobId}/download`;
            const token = localStorage.getItem("accessToken");

            const response = await fetch(downloadUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = job.fileName || fileName || "export";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast.success("File export siap!", {
              description: job.fileName,
            });
            resolve(job);
          } else if (job.status === "failed") {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            toast.error("Export gagal", {
              description: job.error || "Terjadi kesalahan saat export",
            });
            reject(new Error(job.error));
          } else if (attempts >= maxAttempts) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            toast.error("Export timeout", {
              description: "Proses export terlalu lama",
            });
            reject(new Error("Export timeout"));
          }
        } catch (err) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          toast.error("Gagal memeriksa status export");
          reject(err);
        }
      }, 2000);
    });
  }, []);

  // ── Handle instant CSV download (blob response) ──
  const handleInstantDownload = useCallback((response, fileName) => {
    const blob = new Blob([response.data], {
      type: response.headers["content-type"],
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success("File export siap!", { description: fileName });
  }, []);

  // ── Export Task CSV ────────────────────────────────
  const exportTaskCSV = useCallback(
    async (workspaceId, filters = {}) => {
      setExporting(true);
      setExportType("task_csv");
      try {
        toast.info("Mengekspor task ke CSV...");

        const response = await api.post(
          `/workspaces/${workspaceId}/export/tasks/csv`,
          { filters },
          { responseType: "blob" },
        );

        // Check if instant download (200) or background job (202)
        if (response.status === 200) {
          handleInstantDownload(response, `tasks_${Date.now()}.csv`);
        } else {
          // Parse JSON from blob
          const text = await response.data.text();
          const json = JSON.parse(text);
          if (json.data?.jobId) {
            toast.info("Export sedang diproses di background...");
            await pollJob(json.data.jobId, "tasks.csv");
          }
        }
      } catch (err) {
        // Check if error response is a blob with JSON
        if (err.response?.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const json = JSON.parse(text);
            toast.error(json.message || "Export gagal");
          } catch {
            toast.error("Export gagal");
          }
        } else {
          toast.error(err.response?.data?.message || "Export gagal");
        }
      } finally {
        setExporting(false);
        setExportType(null);
      }
    },
    [handleInstantDownload, pollJob],
  );

  // ── Export Task XLSX ───────────────────────────────
  const exportTaskXLSX = useCallback(
    async (workspaceId, filters = {}) => {
      setExporting(true);
      setExportType("task_xlsx");
      try {
        toast.info("Mengekspor task ke Excel...");
        const { data } = await api.post(
          `/workspaces/${workspaceId}/export/tasks/xlsx`,
          { filters },
        );
        if (data.data?.jobId) {
          toast.info("Export sedang diproses...");
          await pollJob(data.data.jobId, "tasks.xlsx");
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Export gagal");
      } finally {
        setExporting(false);
        setExportType(null);
      }
    },
    [pollJob],
  );

  // ── Export Task PDF ────────────────────────────────
  const exportTaskPDF = useCallback(
    async (workspaceId, filters = {}) => {
      setExporting(true);
      setExportType("task_pdf");
      try {
        toast.info("Mengekspor Kanban ke PDF...");
        const { data } = await api.post(
          `/workspaces/${workspaceId}/export/tasks/pdf`,
          { filters },
        );
        if (data.data?.jobId) {
          toast.info("Export sedang diproses...");
          await pollJob(data.data.jobId, "kanban.pdf");
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Export gagal");
      } finally {
        setExporting(false);
        setExportType(null);
      }
    },
    [pollJob],
  );

  // ── Export Event PDF ───────────────────────────────
  const exportEventPDF = useCallback(
    async (workspaceId, eventId) => {
      setExporting(true);
      setExportType("event_pdf");
      try {
        toast.info("Mengekspor Event ke PDF...");
        const { data } = await api.post(
          `/workspaces/${workspaceId}/export/events/${eventId}/pdf`,
        );
        if (data.data?.jobId) {
          toast.info("Export sedang diproses...");
          await pollJob(data.data.jobId, "event.pdf");
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Export gagal");
      } finally {
        setExporting(false);
        setExportType(null);
      }
    },
    [pollJob],
  );

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  return {
    exporting,
    exportType,
    exportTaskCSV,
    exportTaskXLSX,
    exportTaskPDF,
    exportEventPDF,
    cleanup,
  };
}
