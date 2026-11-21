"use client";

import { useEffect, useRef, useState } from "react";
import { uploadImageToR2, type UploadedImage } from "./media-upload.client";
import type { MediaPurpose } from "./image-compress";

export function useImageUpload(purpose: MediaPurpose) {
  const [status, setStatus] = useState<"idle" | "compressing" | "uploading" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const upload = async (file: File): Promise<UploadedImage | null> => {
    controller.current?.abort();
    controller.current = new AbortController();
    setStatus("compressing");
    setError(null);
    try {
      setStatus("uploading");
      const uploaded = await uploadImageToR2(file, {
        purpose,
        signal: controller.current.signal,
        onProgress: setProgress,
      });
      setResult(uploaded);
      setStatus("idle");
      setProgress(100);
      return uploaded;
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return null;
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "chat.uploadFailed");
      return null;
    }
  };
  const abort = (): void => controller.current?.abort();
  const reset = (): void => {
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    setResult(null);
    setStatus("idle");
    setProgress(0);
    setError(null);
  };
  return { status, progress, result, error, upload, abort, reset };
}
