import 'server-only';
import sharp from 'sharp';

/** Longest side of a stored image, in pixels. */
export const MAX_IMAGE_SIDE = 1600;

export class ImageConvertError extends Error {}

/**
 * Normalise an uploaded photo for storage: auto-rotate by EXIF, strip all metadata (GPS, camera),
 * shrink to MAX_IMAGE_SIDE on the longest side (never enlarge), and encode as WebP (quality 80,
 * transparency kept). Throws ImageConvertError for anything that is not a readable image.
 */
export async function toWebp(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    const out = await sharp(bytes, { failOn: 'error', limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, alphaQuality: 90, effort: 4 })
      .toBuffer();
    return new Uint8Array(out);
  } catch {
    throw new ImageConvertError('This image could not be read. Upload a JPG, PNG or WebP photo.');
  }
}
