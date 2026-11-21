"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageUploadField } from "@/components/media/ImageUploadField";
import type { UploadedImage } from "@/lib/media/media-upload.client";
import { useText } from "@/lib/i18n";

export function AvatarUploadSection(): React.JSX.Element {
  const { t } = useText();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/profile", { credentials: "include" })
      .then((response) => response.ok ? response.json() as Promise<{ avatarUrl?: string | null }> : null)
      .then((profile) => setAvatarUrl(profile?.avatarUrl ?? null))
      .catch(() => setAvatarUrl(null));
  }, []);

  const saveAsset = async (assetId: string | null, previewUrl: string | null): Promise<void> => {
    const previous = avatarUrl;
    if (previewUrl) setAvatarUrl(previewUrl);
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarAssetId: assetId }),
      });
      if (!response.ok) throw new Error("avatar update failed");
      const profile = await response.json() as { avatarUrl?: string | null };
      setAvatarUrl(profile.avatarUrl ?? null);
      toast.success(t(assetId ? "settings.avatarUpdated" : "settings.avatarRemoved"));
    } catch {
      setAvatarUrl(previous);
      toast.error(t("chat.uploadFailed"));
    } finally {
      setSaving(false);
    }
  };

  const uploaded = (image: UploadedImage): void => {
    void saveAsset(image.assetId, image.previewUrl);
  };

  return (
    <section className="space-y-3 rounded-xl border border-outline-variant bg-card p-4">
      <h2 className="text-title-sm">{t("settings.avatar")}</h2>
      <ImageUploadField
        purpose="avatar"
        variant="avatar"
        labels={{
          choose: t("settings.chooseAvatar"),
          camera: t("settings.camera"),
          replace: t("settings.replaceAvatar"),
          remove: t("settings.removeAvatar"),
          uploading: t("settings.uploadingAvatar"),
        }}
        valueUrl={avatarUrl}
        disabled={saving}
        onUploaded={uploaded}
        onRemoved={() => void saveAsset(null, null)}
      />
    </section>
  );
}
