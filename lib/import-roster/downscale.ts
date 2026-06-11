const MAX_LONGEST_EDGE = 1500;
const JPEG_QUALITY = 0.85;

export interface DownscaledImage {
  imageBase64: string;
  mimeType: string;
}

export function downscaleImage(file: File): Promise<DownscaledImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const longest = Math.max(width, height);
      const scale =
        longest > MAX_LONGEST_EDGE ? MAX_LONGEST_EDGE / longest : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      const mimeType = dataUrl.split(",")[0].split(":")[1].split(";")[0];
      const imageBase64 = dataUrl.split(",")[1];
      resolve({ imageBase64, mimeType });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
