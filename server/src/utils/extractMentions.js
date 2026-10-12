const mongoose = require("mongoose");

/**
 * Ekstrak daftar @mention { userId, name } dari konten BlockNote.
 *
 * Tahan terhadap semua format yang beredar:
 * - string JSON array blocks — format yang dikirim MentionEditor
 *   saat ini (JSON.stringify(blocks), tanpa field `.mentions`)
 * - array blocks langsung
 * - object { blocks|content, mentions } — field mentions eksplisit
 *   (format dokumen/lama) diutamakan bila valid
 * - object { mentions } saja
 *
 * Inline mention BlockNote berbentuk:
 *   { type: "mention", props: { userId, name } }
 * di dalam `block.content`, dengan `block.children` rekursif.
 * Entri tanpa userId valid (mis. default "unknown") dibuang supaya
 * tidak menyebabkan CastError di query notifikasi.
 */
const extractMentions = (raw) => {
  if (!raw) return [];

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  // Format object dengan mentions eksplisit — pakai langsung.
  if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.mentions)) {
    return dedupe(parsed.mentions);
  }

  // Cari array blocks-nya di mana pun ia berada.
  const blocks = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.blocks)
      ? parsed.blocks
      : Array.isArray(parsed?.content)
        ? parsed.content
        : null;
  if (!blocks) return [];

  const mentions = [];
  const traverse = (items) => {
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      // Inline node mention di dalam block.content
      if (item.type === "mention" && item.props?.userId) {
        const { userId, name } = item.props;
        if (!mentions.some((m) => String(m.userId) === String(userId))) {
          mentions.push({ userId, name: name || "Unknown" });
        }
      }
      if (Array.isArray(item.content)) traverse(item.content);
      if (Array.isArray(item.children)) traverse(item.children);
    }
  };
  traverse(blocks);

  return dedupe(mentions);
};

const dedupe = (list) => {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).filter((m) => {
    const id = m?.userId?.toString?.() ?? String(m?.userId);
    if (!m || !m.userId || id === "unknown") return false;
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

module.exports = { extractMentions };
