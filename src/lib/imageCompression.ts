/**
 * Client-side image compression using Canvas API.
 * No external dependencies — uses built-in browser capabilities.
 * 
 * Reduces image resolution to max 2048px per side and re-encodes as JPEG
 * with quality 0.92 (visually lossless, preserves small text).
 */

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.92,
};

/**
 * Compress a single image file using Canvas API.
 * Returns the compressed file, or the original if compression made it larger.
 */
export async function compressImage(
  file: File,
  options?: CompressOptions
): Promise<File> {
  const { maxWidth, maxHeight, quality } = { ...DEFAULT_OPTIONS, ...options };

  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Only downscale, never upscale
      if (width <= maxWidth && height <= maxHeight) {
        // Still re-encode to JPEG for format consistency & potential size savings
      }

      // Calculate proportional dimensions
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback to original
        return;
      }

      // Use high-quality interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // If compressed is larger than original, return original
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          // Create new File with .jpg extension
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          console.log(
            `[ImageCompression] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB (${Math.round((1 - compressedFile.size / file.size) * 100)}% saved)`
          );

          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Fallback to original on error
    };

    img.src = objectUrl;
  });
}

/**
 * Compress multiple images in parallel.
 */
export async function compressImages(
  files: File[],
  options?: CompressOptions
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}
