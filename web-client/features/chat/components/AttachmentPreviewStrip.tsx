"use client";

import { X } from "lucide-react";
import { useText } from "@/lib/i18n";
import type { ChatAttachment } from "../types";

export function AttachmentPreviewStrip({
  attachments,
  onRemove,
}: {
  attachments: readonly ChatAttachment[];
  onRemove: (id: string) => void;
}): React.JSX.Element | null {
  const { t, formatNumber } = useText();
  if (!attachments.length) return null;
  return (
    <div aria-label={t("chat.attachments")} className="pointer-events-auto mb-2 flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card/95 p-2 backdrop-blur-xl">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {attachment.previewUrl ? (
            // eslint-disable-next-next-line @next/next/no-img-element
            <img src={attachment.previewUrl} alt={attachment.name} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-label-sm">{t("chat.ready")}</span>
          )}
          <button type="button" onClick={() => onRemove(attachment.id)} aria-label={t("chat.removePhoto")}
            className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground shadow">
            <X size={16} aria-hidden="true" />
          </button>
          {attachment.sizeBytes ? <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1 text-label-sm">{formatNumber(Math.ceil(attachment.sizeBytes / 1024))} KB</span> : null}
        </div>
      ))}
    </div>
  );
}
