"use client";

import { Camera, Image as ImageIcon } from "lucide-react";
import { useRef } from "react";
import { useText } from "@/lib/i18n";

export function AttachmentPickerSheet({
  open,
  onClose,
  onFiles,
}: {
  open: boolean;
  onClose: () => void;
  onFiles: (files: readonly File[]) => void;
}): React.JSX.Element | null {
  const { t } = useText();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  if (!open) return null;
  const select = (input: HTMLInputElement | null) => {
    onClose();
    input?.click();
  };
  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto w-full max-w-[430px] px-margin">
      <section role="dialog" aria-label={t("chat.addPhoto")} className="rounded-2xl border border-border bg-card p-2 shadow-xl">
        <button type="button" onClick={() => select(cameraRef.current)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-muted">
          <Camera size={22} aria-hidden="true" /><span className="text-label-lg">{t("chat.takePhoto")}</span>
        </button>
        <button type="button" onClick={() => select(libraryRef.current)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-muted">
          <ImageIcon size={22} aria-hidden="true" /><span className="text-label-lg">{t("chat.chooseLibrary")}</span>
        </button>
      </section>
      <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" hidden
        onChange={(event) => onFiles(Array.from(event.target.files ?? []))} />
      <input ref={libraryRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden
        onChange={(event) => onFiles(Array.from(event.target.files ?? []))} />
    </div>
  );
}
