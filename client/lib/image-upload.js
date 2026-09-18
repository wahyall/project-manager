"use client";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_BANNER_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Validate an image file for board banner/thumbnail
 * @param {File} file
 * @returns {string|null} Error message or null if valid
 */
export function validateBannerImage(file) {
  if (!file) return "File tidak ditemukan";
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Format tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.";
  }
  if (file.size > MAX_BANNER_SIZE) {
    return "Ukuran file maksimal 2MB.";
  }
  return null;
}

/**
 * Upload an image file to ImgBB or fallback to base64 DataURL
 * @param {File} file
 * @returns {Promise<string>} Image URL or base64 Data URL
 */
export async function uploadBannerImage(file) {
  const validationError = validateBannerImage(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

  if (apiKey) {
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target.result.split(",")[1];
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const formData = new FormData();
      formData.append("key", apiKey);
      formData.append("image", base64);
      formData.append("name", file.name.replace(/\.[^.]+$/, ""));

      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data.data.url;
        }
      }
    } catch (err) {
      console.warn("ImgBB upload failed, falling back to base64:", err);
    }
  }

  // Fallback: convert directly to base64 data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
