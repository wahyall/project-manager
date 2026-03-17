const {
  CopilotRuntime,
  copilotRuntimeNodeHttpEndpoint,
} = require("@copilotkit/runtime");
const { BuiltInAgent, defineTool } = require("@copilotkitnext/agent");
const { z } = require("zod");
const AIActionsService = require("../services/aiActions.service");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

const safeReturn = (result) =>
  typeof result === "string" ? result : JSON.stringify(result);

exports.handleCopilotRequest = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const userId = req.user.id;

  if (!workspace) {
    return next(new AppError("Workspace context is required", 400));
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return next(new AppError("GOOGLE_AI_API_KEY is not configured", 500));
  }

  const agent = new BuiltInAgent({
    model: `google/${process.env.GEMINI_MODEL || "gemini-2.0-flash"}`,
    apiKey,
    maxSteps: 5,
    tools: [
      defineTool({
        name: "searchData",
        description:
          "Mencari konteks atau informasi dalam workspace, seperti task, event, komentar, aktivitas, spreadsheet, dll.",
        parameters: z.object({
          query: z
            .string()
            .describe(
              "Pertanyaan atau kata kunci pencarian (misal: 'task apa yang belum selesai', 'siapa yang mengedit event ini')",
            ),
        }),
        execute: async ({ query }) => {
          try {
            return safeReturn(
              await AIActionsService.searchData({
                query,
                workspaceId: workspace._id,
              }),
            );
          } catch (err) {
            console.error("[CopilotKit] searchData error:", err);
            return `Terjadi kesalahan saat mencari data: ${err.message}`;
          }
        },
      }),
      defineTool({
        name: "getWorkspaceSummary",
        description:
          "Mendapatkan ringkasan statistik workspace, jumlah task, event, member, dan task by priority.",
        parameters: z.object({}),
        execute: async () => {
          try {
            return safeReturn(
              await AIActionsService.getWorkspaceSummary({
                workspaceId: workspace._id,
              }),
            );
          } catch (err) {
            console.error("[CopilotKit] getWorkspaceSummary error:", err);
            return `Terjadi kesalahan: ${err.message}`;
          }
        },
      }),
      defineTool({
        name: "createTask",
        description: "Membuat Task baru di workspace ini.",
        parameters: z.object({
          title: z.string().describe("Judul task."),
          description: z.string().optional().describe("Deskripsi task opsional."),
          priority: z
            .string()
            .optional()
            .describe("Prioritas task, pilih dari: low, medium, high, critical."),
          columnId: z
            .string()
            .optional()
            .describe(
              "ID Kolom status tujuan, jika diketahui. Boleh kosong (default ke kolom pertama).",
            ),
        }),
        execute: async ({ title, description, priority, columnId }) => {
          try {
            return safeReturn(
              await AIActionsService.createTask({
                workspace,
                userId,
                title,
                description,
                priority,
                columnId,
              }),
            );
          } catch (err) {
            console.error("[CopilotKit] createTask error:", err);
            return `Terjadi kesalahan saat membuat task: ${err.message}`;
          }
        },
      }),
      defineTool({
        name: "updateTask",
        description:
          "Mengupdate field task yang sudah ada (misalnya pindah kolom status, ubah prioritas, dll).",
        parameters: z.object({
          taskId: z.string().describe("ID task yang akan diupdate."),
          title: z.string().optional().describe("Judul baru."),
          description: z.string().optional().describe("Deskripsi baru."),
          priority: z
            .string()
            .optional()
            .describe("Prioritas baru (low, medium, high, critical)."),
          columnId: z
            .string()
            .optional()
            .describe(
              "ID kolom status tujuan yang baru (misal: pindah ke Done).",
            ),
        }),
        execute: async ({ taskId, title, description, priority, columnId }) => {
          try {
            return safeReturn(
              await AIActionsService.updateTask({
                workspaceId: workspace._id,
                userId,
                taskId,
                updates: { title, description, priority, columnId },
              }),
            );
          } catch (err) {
            console.error("[CopilotKit] updateTask error:", err);
            return `Terjadi kesalahan saat mengupdate task: ${err.message}`;
          }
        },
      }),
      defineTool({
        name: "createEvent",
        description: "Membuat event calendar baru.",
        parameters: z.object({
          title: z.string().describe("Judul event"),
          description: z.string().optional().describe("Deskripsi event"),
          startDate: z
            .string()
            .describe("Tanggal mulai (ISO Date atau YYYY-MM-DD)"),
          endDate: z
            .string()
            .describe("Tanggal selesai (ISO Date atau YYYY-MM-DD)"),
        }),
        execute: async ({ title, description, startDate, endDate }) => {
          try {
            return safeReturn(
              await AIActionsService.createEvent({
                workspaceId: workspace._id,
                userId,
                title,
                description,
                startDate,
                endDate,
              }),
            );
          } catch (err) {
            console.error("[CopilotKit] createEvent error:", err);
            return `Terjadi kesalahan saat membuat event: ${err.message}`;
          }
        },
      }),
      defineTool({
        name: "assignMember",
        description:
          "Menugaskan (assign) atau menghapus (unassign) member dari sebuah task.",
        parameters: z.object({
          taskId: z.string().describe("ID Task"),
          memberId: z.string().describe("ID Member (user)"),
          action: z
            .string()
            .describe("Aksi ('assign' atau 'unassign')"),
        }),
        execute: async ({ taskId, memberId, action }) => {
          try {
            return safeReturn(
              await AIActionsService.assignMember({
                workspaceId: workspace._id,
                userId,
                taskId,
                memberId,
                action,
              }),
            );
          } catch (err) {
            console.error("[CopilotKit] assignMember error:", err);
            return `Terjadi kesalahan saat assign member: ${err.message}`;
          }
        },
      }),
    ],
  });

  const runtime = new CopilotRuntime({
    agents: { default: agent },
  });

  const handler = copilotRuntimeNodeHttpEndpoint({
    runtime,
    endpoint: "/",
  });

  await handler(req, res);
});
