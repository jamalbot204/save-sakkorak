/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Compresses an image data URL to a capped-resolution JPEG.
 * All images passing through the chat pipeline are routed here
 * before preview, storage, and network transmission.
 */

export function compressImage(
  dataUrl: string,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!dataUrl.startsWith("data:image/png") && !dataUrl.startsWith("data:image/jpeg")) {
      return reject(new Error("Unsupported image format — only PNG and JPEG are allowed"));
    }

    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context unavailable"));

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}
