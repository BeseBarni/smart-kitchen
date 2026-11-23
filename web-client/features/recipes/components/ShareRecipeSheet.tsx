"use client";

import { useState, useSyncExternalStore } from "react";
import { Copy, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useText } from "@/lib/i18n";
import { useRecipeShare, type RecipeShareAction } from "../hooks/use-recipe-share";

interface Props {
  recipeId: string;
  shareToken: string | null;
  sharedAt: string | null;
}

function subscribeToBrowserState(): () => void {
  return () => undefined;
}

function getBrowserOrigin(): string {
  return window.location.origin;
}

function getNativeShareSupport(): boolean {
  return typeof navigator.share === "function";
}

export function ShareRecipeSheet({ recipeId, shareToken, sharedAt }: Props): React.JSX.Element {
  const { t } = useText();
  const mutation = useRecipeShare();
  const [open, setOpen] = useState(false);
  const origin = useSyncExternalStore(subscribeToBrowserState, getBrowserOrigin, () => "");
  const nativeShareAvailable = useSyncExternalStore(
    subscribeToBrowserState,
    getNativeShareSupport,
    () => false,
  );
  const isShared = shareToken !== null && sharedAt !== null;
  const shareUrl = isShared && origin
    ? `${origin}/r/${shareToken}`
    : null;
  const pendingAction = mutation.variables?.action;

  const updateShare = (action: RecipeShareAction): void => {
    void mutation.mutateAsync({ id: recipeId, action }).then(
      () => toast.success(t(action === "revoke" ? "recipes.shareRevoked" : "recipes.shareEnabled")),
      () => undefined,
    );
  };

  const copyLink = (): void => {
    if (!shareUrl || !navigator.clipboard) {
      toast.error(t("recipes.shareCopyError"));
      return;
    }
    void navigator.clipboard.writeText(shareUrl).then(
      () => toast.success(t("recipes.shareCopied")),
      () => toast.error(t("recipes.shareCopyError")),
    );
  };

  const nativeShare = (): void => {
    if (!shareUrl || typeof navigator.share !== "function") return;
    void navigator.share({ title: document.title, url: shareUrl }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("recipes.shareError"));
    });
  };

  const openPreview = (): void => {
    if (shareUrl) window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="min-h-11 min-w-11"
        aria-label={t("recipes.share")}
        onClick={() => setOpen(true)}
      >
        <Share2 aria-hidden="true" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[85dvh] w-full max-w-[430px] gap-4 overflow-y-auto rounded-t-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="space-y-1 pr-10">
            <SheetTitle>{t("recipes.shareSheetTitle")}</SheetTitle>
            <SheetDescription>{t("recipes.shareSheetDescription")}</SheetDescription>
          </div>
          {!isShared ? (
            <div className="space-y-3">
              <p className="text-body-sm text-muted-foreground">{t("recipes.sharePrivate")}</p>
              <Button
                type="button"
                className="h-12 w-full"
                disabled={mutation.isPending}
                onClick={() => updateShare("enable")}
              >
                {mutation.isPending
                  ? t(pendingAction === "revoke" ? "recipes.shareStopping" : "recipes.shareCreating")
                  : t("recipes.shareCreateLink")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block space-y-1 text-label-md">
                <span>{t("recipes.sharePublicLink")}</span>
                <input readOnly value={shareUrl ?? ""} className="h-11 w-full rounded-lg border border-border bg-muted px-3 text-body-sm" />
              </label>
              <Button type="button" className="h-12 w-full" onClick={copyLink}>
                <Copy aria-hidden="true" />{t("recipes.shareCopyLink")}
              </Button>
              {nativeShareAvailable && (
                <Button type="button" variant="outline" className="h-12 w-full" onClick={nativeShare}>
                  <Share2 aria-hidden="true" />{t("recipes.shareNative")}
                </Button>
              )}
              <Button type="button" variant="outline" className="h-12 w-full" onClick={openPreview}>
                <ExternalLink aria-hidden="true" />{t("recipes.shareOpenPreview")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full"
                disabled={mutation.isPending}
                onClick={() => updateShare("regenerate")}
              >
                {t("recipes.shareRegenerateLink")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-12 w-full"
                disabled={mutation.isPending}
                onClick={() => updateShare("revoke")}
              >
                {t("recipes.shareStopSharing")}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
