"use client";

import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { useImageUpload } from "@/lib/media/use-image-upload";
import type { UploadedImage } from "@/lib/media/media-upload.client";

export interface ImageUploadFieldLabels {
  choose: string;
  camera: string;
  replace: string;
  remove: string;
  uploading: string;
}

interface Props {
  purpose: "avatar" | "recipe_cover" | "ingredient_photo" | "inventory_photo" | "receipt_scan" | "chat_attachment";
  variant: "avatar" | "cover" | "square" | "wide";
  labels: ImageUploadFieldLabels;
  valueUrl?: string | null;
  disabled?: boolean;
  onUploaded: (image: UploadedImage) => void;
  onRemoved: () => void;
}

export function ImageUploadField({
  purpose,
  variant,
  labels,
  valueUrl,
  disabled,
  onUploaded,
  onRemoved,
}: Props): React.JSX.Element {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const upload = useImageUpload(purpose);
  const preview = upload.result?.previewUrl ?? valueUrl;
  const choose = (input: HTMLInputElement | null): void => input?.click();
  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const uploaded = await upload.upload(file);
    if (uploaded) onUploaded(uploaded);
  };
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    void handleFile(file);
  };
  const shape = variant === "avatar"
    ? "size-24 rounded-full"
    : variant === "cover"
      ? "aspect-[4/3] w-full rounded-xl"
      : variant === "wide"
        ? "aspect-[16/9] w-full rounded-xl"
        : "size-24 rounded-xl";

  return (
    <div className="space-y-2">
      <div className={`relative overflow-hidden border border-outline-variant bg-surface-container-low ${shape}`}>
        {preview
          ? <img src={preview} alt="" className="size-full object-cover" />
          : <div className="flex size-full items-center justify-center text-muted-foreground"><ImagePlus size={24} /></div>}
        {upload.status !== "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-on-surface/55 text-body-sm text-on-primary">
            {labels.uploading} {upload.status === "uploading" ? `${upload.progress}%` : ""}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => choose(galleryRef.current)}>
          <ImagePlus size={16} />{preview ? labels.replace : labels.choose}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => choose(cameraRef.current)}>
          <Camera size={16} />{labels.camera}
        </Button>
        {preview && (
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => {
            upload.reset();
            onRemoved();
          }}>
            <Trash2 size={16} />{labels.remove}
          </Button>
        )}
      </div>
      {upload.error && <p role="alert" className="text-body-sm text-destructive">{upload.error}</p>}
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden"
        onChange={handleFileChange} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={handleFileChange} />
    </div>
  );
}
