const cron = require("node-cron");
const mongoose = require("mongoose");
const Workspace = require("../models/Workspace");

/**
 * Cron job: Re-index embedding seluruh workspace
 * Jadwal: 03:00 WIB (20:00 UTC) setiap hari
 *
 * Ini adalah fallback untuk menjaga konsistensi embedding
 * jika ada hook yang gagal/terlewat
 */
const startEmbeddingReindexJob = () => {
  cron.schedule("0 20 * * *", async () => {
    console.log("[Cron] Running embeddingReindex job");
    try {
      // Lazy-load to avoid circular dependency
      const EmbeddingService = require("../services/embedding.service");

      // Check if Google AI API key is configured
      if (!process.env.GOOGLE_AI_API_KEY) {
        console.log(
          "[Cron] GOOGLE_AI_API_KEY not set, skipping embeddingReindex",
        );
        return;
      }

      // Get all active workspaces
      const workspaces = await Workspace.find({
        isDeleted: { $ne: true },
        isArchived: { $ne: true },
      })
        .select("_id name")
        .lean();

      console.log(`[Cron] Re-indexing ${workspaces.length} workspaces`);

      let successCount = 0;
      let errorCount = 0;

      for (const ws of workspaces) {
        try {
          await EmbeddingService.syncWorkspace(ws._id);
          successCount++;
        } catch (err) {
          console.error(
            `[Cron] Failed to re-index workspace ${ws.name} (${ws._id}):`,
            err.message,
          );
          errorCount++;
        }
      }

      console.log(
        `[Cron] embeddingReindex job finished: ${successCount} success, ${errorCount} errors`,
      );
    } catch (err) {
      console.error("[Cron] Error in embeddingReindex job:", err);
    }
  });
};

module.exports = startEmbeddingReindexJob;
