"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { resolveEntityImages } from "@app/modules/schemas";

type Props = {
  entity: {
    imageAssetId?: string | null;
    stockImageKind?: "themealdb_meal" | "themealdb_ingredient" | null;
    stockImageName?: string | null;
    imageUrl?: string | null;
  };
  alt: string;
  size: "small" | "medium" | "large";
  fill?: boolean;
  className?: string;
  fallback: ReactNode;
};

export function ResolvedEntityImage({
  entity,
  alt,
  size,
  fill = true,
  className = "object-cover",
  fallback,
}: Props): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const urls = resolveEntityImages(entity);
  const src = urls[size];
  if (!src || failed) return <>{fallback}</>;
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      unoptimized={src.startsWith("/api/media/")}
      sizes={size === "small" ? "64px" : size === "medium" ? "(max-width: 430px) 100vw, 430px" : "430px"}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
