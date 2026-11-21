import { presignUploadResponseSchema } from "@app/modules/schemas";
import { unwrapApiResponse } from "@/lib/api-client";
import { compressImage, type MediaPurpose } from "./image-compress";

export interface UploadedImage {
  assetId: string;
  url: string;
  mimeType: "image/jpeg" | "image/webp";
  width: number;
  height: number;
  sizeBytes: number;
  previewUrl: string;
}

function putFile(
  uploadUrl: string,
  blob: Blob,
  headers: Record<string, string>,
  signal?: AbortSignal,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error(`chat.uploadFailed:${xhr.status}`));
    xhr.onerror = () => reject(new Error("chat.uploadFailed"));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));
    xhr.open("PUT", uploadUrl);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(blob);
  });
}

export async function uploadImageToR2(
  file: File,
  options: {
    purpose: MediaPurpose;
    signal?: AbortSignal;
    onProgress?: (progress: number) => void;
  },
): Promise<UploadedImage> {
  const compressed = await compressImage(file, options.purpose);
  const limit = options.purpose === "avatar" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
  if (compressed.sizeBytes > limit) throw new Error("chat.attachmentTooLarge");
  const presignResponse = await fetch("/api/media/presign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    signal: options.signal,
    body: JSON.stringify({
      purpose: options.purpose,
      mimeType: compressed.mimeType,
      sizeBytes: compressed.sizeBytes,
      width: compressed.width,
      height: compressed.height,
    }),
  });
  const presign = await unwrapApiResponse(presignResponse, presignUploadResponseSchema);
  await putFile(presign.uploadUrl, compressed.blob, presign.requiredHeaders, options.signal, options.onProgress);
  const confirm = await fetch(`/api/media/${presign.assetId}/confirm`, {
    method: "POST",
    credentials: "include",
    signal: options.signal,
  });
  if (!confirm.ok) throw new Error("chat.uploadFailed");
  return {
    assetId: presign.assetId,
    url: `/api/media/${presign.assetId}/file`,
    mimeType: compressed.mimeType,
    width: compressed.width,
    height: compressed.height,
    sizeBytes: compressed.sizeBytes,
    previewUrl: compressed.previewUrl,
  };
}
