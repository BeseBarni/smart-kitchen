import type { ChatAttachment } from "../types";

const MAX_COUNT = 3;
const MAX_EDGE = 1600;
const MAX_MIME_SIZE = 2_500_000;
const SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function validateImageFiles(files: readonly File[]): string | null {
  if (files.length > MAX_COUNT) return "chat.tooManyAttachments";
  if (files.some((file) => !SUPPORTED.has(file.type))) return "chat.unsupportedAttachment";
  return null;
}

async function decodeFile(file: File): Promise<ImageBitmap> {
  if ("createImageBitmap" in globalThis) return createImageBitmap(file, { imageOrientation: "from-image" });
  throw new Error("chat.imageUnsupported");
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("chat.compressionFailed")), "image/jpeg", 0.82);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("chat.compressionFailed"));
      resolve(result.split(",", 2)[1] ?? "");
    };
    reader.onerror = () => reject(new Error("chat.compressionFailed"));
    reader.readAsDataURL(blob);
  });
}

export async function compressImageFiles(files: readonly File[]): Promise<ChatAttachment[]> {
  const validationError = validateImageFiles(files);
  if (validationError) throw new Error(validationError);
  const prepared: ChatAttachment[] = [];
  for (const file of files) {
    const bitmap = await decodeFile(file);
    try {
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("chat.compressionFailed");
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvasBlob(canvas);
      if (blob.size > MAX_MIME_SIZE) throw new Error("chat.attachmentTooLarge");
      const base64Data = await blobToBase64(blob);
      prepared.push({
        id: crypto.randomUUID(),
        name: file.name || `photo-${prepared.length + 1}.jpg`,
        mimeType: "image/jpeg",
        base64Data,
        previewUrl: URL.createObjectURL(blob),
        width,
        height,
        sizeBytes: blob.size,
      });
      if (prepared.reduce((total, attachment) => total + (attachment.base64Data?.length ?? 0), 0) > 4_500_000) {
        throw new Error("chat.attachmentTooLarge");
      }
    } finally {
      bitmap.close();
    }
  }
  return prepared;
}

export function revokeAttachmentPreviews(attachments: readonly ChatAttachment[]): void {
  for (const attachment of attachments) {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
  }
}
