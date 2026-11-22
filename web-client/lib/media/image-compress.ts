import type { MediaPurpose } from "@app/modules/schemas";
export type { MediaPurpose } from "@app/modules/schemas";

export interface CompressedImage {
  blob: Blob;
  mimeType: "image/jpeg" | "image/webp";
  width: number;
  height: number;
  sizeBytes: number;
  previewUrl: string;
}

function preset(purpose: MediaPurpose): { maxEdge: number; square: boolean; quality: number } {
  if (purpose === "avatar") return { maxEdge: 512, square: true, quality: 0.85 };
  if (purpose === "chat_attachment") return { maxEdge: 1600, square: false, quality: 0.82 };
  if (purpose === "receipt_scan") return { maxEdge: 1600, square: false, quality: 0.82 };
  return { maxEdge: 1280, square: false, quality: 0.84 };
}

export async function compressImage(file: File, purpose: MediaPurpose): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const config = preset(purpose);
    let sourceWidth = bitmap.width;
    let sourceHeight = bitmap.height;
    let sourceX = 0;
    let sourceY = 0;
    if (config.square) {
      const size = Math.min(sourceWidth, sourceHeight);
      sourceX = Math.round((sourceWidth - size) / 2);
      sourceY = Math.round((sourceHeight - size) / 2);
      sourceWidth = size;
      sourceHeight = size;
    }
    const scale = Math.min(1, config.maxEdge / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("chat.compressionFailed");
    context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("chat.compressionFailed")),
        "image/webp",
        config.quality,
      );
    }).catch(async () => new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("chat.compressionFailed")),
        "image/jpeg",
        config.quality,
      );
    }));
    return {
      blob,
      mimeType: blob.type === "image/jpeg" ? "image/jpeg" : "image/webp",
      width,
      height,
      sizeBytes: blob.size,
      previewUrl: URL.createObjectURL(blob),
    };
  } finally {
    bitmap.close();
  }
}
