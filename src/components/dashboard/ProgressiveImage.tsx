import { useState, useEffect, useRef, ImgHTMLAttributes } from "react";
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
  /** rootMargin for IntersectionObserver — how early to start loading high-res. */
  rootMargin?: string;
}

/**
 * Renders an image with progressive lazy loading:
 *   1. Loads a tiny low-quality version immediately (acts as blurred placeholder/avatar).
 *   2. When the element enters the viewport, starts fetching the full-quality image.
 *   3. Swaps to the full-quality image once it's loaded.
 */
export function ProgressiveImage({
  src,
  fullSrc,
  lowQualityWidth = 40,
  lowQualityQuality = 30,
  rootMargin = "200px",
  className,
  alt = "",
  onError,
  ...rest
}: ProgressiveImageProps) {
  const [fullLoaded, setFullLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);

  const lowSrc = optimizeStorageImage(src, {
    width: lowQualityWidth,
    quality: lowQualityQuality,
  });
  const highSrc = rewriteStorageUrl(fullSrc ?? src);

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

  return (
    <span ref={containerRef} className="contents">
      {/* Low-quality blurred placeholder shown until the full image is ready */}
      {!fullLoaded && (
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
      {/* Full-quality image — only mounted once the element scrolls near the viewport. */}
      {inView && (
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
      )}
    </span>
  );
}
