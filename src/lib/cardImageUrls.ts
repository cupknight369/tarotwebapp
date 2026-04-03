import type { TransformOptions } from '@supabase/storage-js';
import { supabase } from './supabase.js';

export const CARD_IMAGE_BUCKET = 'card-images';

function minorFilenames(prefix: string): string[] {
  return Array.from({ length: 14 }, (_, i) => `${prefix}${String(i + 1).padStart(2, '0')}.webp`);
}

/** Every object key in the `card-images` bucket (86 files). */
export const ALL_CARD_FILENAMES: readonly string[] = [
  ...Array.from({ length: 22 }, (_, i) => `m${String(i).padStart(2, '0')}.webp`),
  'm06c.webp',
  'm07c.webp',
  'm10c.webp',
  'm15c.webp',
  'm17c.webp',
  'm19c.webp',
  'm20c.webp',
  'm21c.webp',
  ...minorFilenames('w'),
  ...minorFilenames('c'),
  ...minorFilenames('s'),
  ...minorFilenames('p'),
];

export function publicCardImageUrl(filename: string, transform?: TransformOptions): string {
  const { data } = supabase.storage
    .from(CARD_IMAGE_BUCKET)
    .getPublicUrl(filename, transform ? { transform } : undefined);
  return data.publicUrl;
}

const PREFETCH_CONCURRENCY = 8;

function loadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Fire-and-forget: does not return a promise for callers to await. */
export function startCardImagePrefetch(): void {
  void (async () => {
    const urls = ALL_CARD_FILENAMES.map((f) => publicCardImageUrl(f));
    for (let i = 0; i < urls.length; i += PREFETCH_CONCURRENCY) {
      const batch = urls.slice(i, i + PREFETCH_CONCURRENCY);
      await Promise.all(batch.map(loadImage));
    }
  })().catch(() => {});
}
