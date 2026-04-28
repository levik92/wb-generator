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
 * Single <img> element that progressively swaps its src:
 *   1. Tiny blurred placeholder shown immediately (with blur filter).
 *   2. When the element is near the viewport, preload the medium-quality
 *      preview in the background. As soon as it's ready, swap src and
 *      remove the blur — same DOM node, no layout shift, no overlap.
 *   3. (Optional) Same swap again to full resolution if `loadFull` / `fullSrc`.
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
  style,
  ...rest
}: ProgressiveImageProps) {
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

  const [currentSrc, setCurrentSrc] = useState<string>(lowSrc);
  const [stage, setStage] = useState<"low" | "preview" | "full">("low");
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset when src changes.
  useEffect(() => {
    setCurrentSrc(lowSrc);
    setStage("low");
    setFailed(false);
  }, [lowSrc]);

  // Intersection observer to trigger preview load.
  useEffect(() => {
    if (inView) return;
    const el = imgRef.current;
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

  // Preload preview, then swap src.
  useEffect(() => {
    if (!inView || stage !== "low" || !previewSrc || previewSrc === lowSrc) return;
    const img = new Image();
    let cancelled = false;
    img.onload = () => {
      if (cancelled) return;
      setCurrentSrc(previewSrc);
      setStage("preview");
    };
    img.onerror = () => {
      if (cancelled) return;
      // Fall back to original URL if transform endpoint fails.
      const fallback = rewriteStorageUrl(src);
      const f = new Image();
      f.onload = () => {
        if (cancelled) return;
        setCurrentSrc(fallback);
        setStage("preview");
      };
      f.onerror = () => {
        if (!cancelled) setFailed(true);
      };
      f.src = fallback;
    };
    img.src = previewSrc;
    return () => {
      cancelled = true;
    };
  }, [inView, stage, previewSrc, lowSrc, src]);

  // Optional step 3 — full resolution.
  useEffect(() => {
    if (!wantFull || stage !== "preview" || !fullResolved) return;
    const img = new Image();
    let cancelled = false;
    img.onload = () => {
      if (cancelled) return;
      setCurrentSrc(fullResolved);
      setStage("full");
    };
    img.src = fullResolved;
    return () => {
      cancelled = true;
    };
  }, [wantFull, stage, fullResolved]);

  if (failed) return null;

  const isBlurred = stage === "low";

  return (
    <img
      {...rest}
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      style={style}
      className={cn(
        className,
        "transition-[filter] duration-300",
        isBlurred && "blur-md"
      )}
    />
  );
}
