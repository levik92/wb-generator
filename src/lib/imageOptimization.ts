/**
 * Supabase Storage on-the-fly image transforms.
 * Adds ?width=&quality= to public URLs that point to the project's Supabase storage.
 * Falls back to the original URL for any non-Supabase or unrecognized URL.
 */
import { rewriteStorageUrl } from './storage';

const SUPABASE_HOST_HINTS = [
  'supabase.co/storage/v1/object/public/',
  'api.wbgen.ru/storage/v1/object/public/',
];

export interface OptimizedImageOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  resize?: 'cover' | 'contain' | 'fill';
}

export function optimizeStorageImage(url: string | undefined | null, opts: OptimizedImageOptions = {}): string {
  if (!url) return '';
  if (typeof url !== 'string') return url as any;
  if (!SUPABASE_HOST_HINTS.some((h) => url.includes(h))) return url;
  // Skip if URL already has transformation params
  if (/[?&](width|height|quality)=/.test(url)) return url;

  const params: string[] = [];
  if (opts.width) params.push(`width=${Math.round(opts.width)}`);
  if (opts.height) params.push(`height=${Math.round(opts.height)}`);
  if (opts.quality) params.push(`quality=${Math.max(20, Math.min(100, Math.round(opts.quality)))}`);
  if (opts.resize) params.push(`resize=${opts.resize}`);

  if (params.length === 0) return url;

  // Convert /object/public/ → /render/image/public/ for transformations
  const renderUrl = url.replace('/object/public/', '/render/image/public/');
  const sep = renderUrl.includes('?') ? '&' : '?';
  return `${renderUrl}${sep}${params.join('&')}`;
}

/** Tiny (56-64px) thumbnail used in list previews. */
export function thumbUrl(url: string | undefined | null): string {
  return optimizeStorageImage(url, { width: 160, quality: 70 });
}

/** Medium (~150-300px) preview used in expanded grid. */
export function previewUrl(url: string | undefined | null): string {
  return optimizeStorageImage(url, { width: 400, quality: 80 });
}
