import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { optimizeStorageImage, rewriteStorageUrl } from "@/lib/imageOptimization";

interface ProgressiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  /** Width in px for the low-quality placeholder fetched from Supabase transform. */
  lowQualityWidth?: number;
  /** Quality (1-100) for the low-quality placeholder. */
  lowQualityQuality?: number;
  /** Optional explicit full-quality src. Defaults to original `src`. */
  fullSrc?: string;
}

/**
 * Renders an image with progressive loading:
 *   1. Loads a tiny low-quality version first (via Supabase image transform).
 *   2. Loads the full-quality image in background and swaps in once ready.
 *
 * Uses `object-fit: cover` on the full image — so the entire picture is visible
 * (just framed), unlike Supabase `resize=cover` transforms that crop the source.
 */
export function ProgressiveImage({
  src,
  fullSrc,
  lowQualityWidth = 40,
  lowQualityQuality = 30,
  className,
  alt = "",
  onError,
  ...rest
}: ProgressiveImageProps) {
  const [fullLoaded, setFullLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const lowSrc = optimizeStorageImage(src, {
    width: lowQualityWidth,
    quality: lowQualityQuality,
  });
  const highSrc = rewriteStorageUrl(fullSrc ?? src);

  if (failed) return null;

  return (
    <>
      {/* Low-quality blurred placeholder shown until the full image is ready */}
      {!fullLoaded && (
        <img
          {...rest}
          src={lowSrc}
          alt={alt}
          aria-hidden="true"
          className={cn(className, "blur-md scale-105")}
        />
      )}
      {/* Full-quality image. Hidden visually until loaded but always mounted so
          the browser fetches it. */}
      <img
        {...rest}
        src={highSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setFullLoaded(true)}
        onError={(e) => {
          setFailed(true);
          onError?.(e);
        }}
        className={cn(
          className,
          "transition-opacity duration-300",
          fullLoaded ? "opacity-100" : "opacity-0 absolute inset-0"
        )}
      />
    </>
  );
}
