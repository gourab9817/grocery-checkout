/**
 * Resolves a product image URL from its slug.
 *
 * Source of truth is the S3/CDN bucket; VITE_IMAGE_BASE_URL is baked at build time.
 *   - Local dev (no S3):  "/images"            → served from apps/web/public/images
 *   - Floci S3:           "http://localhost:4566/ansrmart-images/images"
 *   - Production CDN:      "https://cdn.ansrmart.io/images"
 */
const BASE = import.meta.env.VITE_IMAGE_BASE_URL ?? '/images';

export function imageUrl(slug) {
  if (!slug) return null;
  return `${BASE}/${slug}.jpg`;
}
