/**
 * Image compression utility for client-side image optimization
 * Compresses images before upload to stay under the 5MB API limit
 */

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB - leave some buffer for base64 encoding
const MAX_DIMENSION = 2048; // Max width or height
const JPEG_QUALITY = 0.85; // 85% quality for JPEG compression

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

/**
 * Compresses an image file if it exceeds the size limit
 * @param file - The original image file
 * @returns A promise with the compressed file or original if under limit
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;
  
  // If file is already under limit, return as-is
  if (originalSize <= MAX_FILE_SIZE) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }

  try {
    const compressedFile = await compressImageFile(file);
    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      wasCompressed: true,
    };
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }
}

/**
 * Compresses multiple image files
 * @param files - Array of image files
 * @returns Array of compression results
 */
export async function compressImages(files: File[]): Promise<CompressionResult[]> {
  return Promise.all(files.map(compressImage));
}

/**
 * Internal function to compress a single image file
 */
async function compressImageFile(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          // Create canvas and draw image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Could not create blob from canvas'));
                return;
              }
              
              // If still too large, try again with lower quality
              if (blob.size > MAX_FILE_SIZE) {
                canvas.toBlob(
                  (lowerQualityBlob) => {
                    if (!lowerQualityBlob) {
                      reject(new Error('Could not create lower quality blob'));
                      return;
                    }
                    
                    const newFileName = getCompressedFileName(file.name);
                    const compressedFile = new File([lowerQualityBlob], newFileName, {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                  },
                  'image/jpeg',
                  0.7 // Lower quality for very large images
                );
              } else {
                const newFileName = getCompressedFileName(file.name);
                const compressedFile = new File([blob], newFileName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            JPEG_QUALITY
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a compressed file name, changing extension to .jpg
 */
function getCompressedFileName(originalName: string): string {
  const nameParts = originalName.split('.');
  if (nameParts.length > 1) {
    nameParts.pop(); // Remove original extension
  }
  return `${nameParts.join('.')}.jpg`;
}

/**
 * Format bytes to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
