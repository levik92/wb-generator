import { useState, useEffect, useRef, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { optimizeStorageImage, rewriteStorageUrl } from "@/lib/imageOptimization";

interface ProgressiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  /** Width in px for the low-quality placeholder fetched from Supabase transform. */
  lowQualityWidth?: number;
  /** Quality (1-100) for the low-quality placeholder. */
  lowQualityQuality?: number;
  /** Width in px for the medium-quality "preview" step (the visible avatar/thumbnail size). */
  previewWidth?: number;
  /** Quality (1-100) for the medium-quality preview step. */
  previewQuality?: number;
  /** Optional explicit full-quality src. If provided, full-res is fetched after the preview. */
  fullSrc?: string;
  /** Force loading the original full-resolution file after the preview step. */
  loadFull?: boolean;
  /** rootMargin for IntersectionObserver — how early to start loading. */
  rootMargin?: string;
}

/**
 * Three-step progressive lazy image:
 *   1. Tiny blurred placeholder (~40px) — shown immediately as an "avatar".
 *   2. Medium-quality preview sized to the actual display container (e.g. 200-400px).
 *      Loaded once the element scrolls near the viewport. This becomes the
 *      sharp visible image in lists/history.
 *   3. (Optional) Full-resolution original — only fetched when `loadFull` is set
 *      or `fullSrc` is provided, after the preview is ready. Useful for zoom/expand.
 */
export function ProgressiveImage({
  src,
  fullSrc,
  lowQualityWidth = 40,
  lowQualityQuality = 30,
  previewWidth = 480,
  previewQuality = 75,
  loadFull = false,
  rootMargin = "200px",
  className,
  alt = "",
  onError,
  ...rest
}: ProgressiveImageProps) {
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);

  const lowSrc = optimizeStorageImage(src, {
    width: lowQualityWidth,
    quality: lowQualityQuality,
  });
  const previewSrc = optimizeStorageImage(src, {
    width: previewWidth,
    quality: previewQuality,
  });
  const wantFull = loadFull || !!fullSrc;
  const fullResolved = rewriteStorageUrl(fullSrc ?? src);

  useEffect(() => {
    if (inView) return;
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  if (failed) return null;

  // The "current best" image visible to the user at any moment.
  const sharpReady = previewLoaded || fullLoaded;

  return (
    <span ref={containerRef} className="contents">
      {/* Step 1 — tiny blurred avatar. Stays mounted until the preview step is ready. */}
      {!sharpReady && (
        <img
          {...rest}
          src={lowSrc}
          alt={alt}
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={cn(className, "blur-md scale-105")}
        />
      )}

      {/* Step 2 — medium-quality preview sized to the container. Mounted once visible. */}
      {inView && (
        <img
          {...rest}
          src={previewSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setPreviewLoaded(true)}
          onError={(e) => {
            setFailed(true);
            onError?.(e);
          }}
          className={cn(
            className,
            "transition-opacity duration-300",
            // Hide preview once full-res is in (avoids double-paint), otherwise show it.
            fullLoaded
              ? "opacity-0 absolute inset-0"
              : previewLoaded
                ? "opacity-100"
                : "opacity-0 absolute inset-0"
          )}
        />
      )}

      {/* Step 3 — full-resolution original. Only mounted after preview is ready
          and only if explicitly requested. */}
      {inView && wantFull && previewLoaded && (
        <img
          {...rest}
          src={fullResolved}
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
      )}
    </span>
  );
}
