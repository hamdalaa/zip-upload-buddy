/**
 * Optimize remote image URLs for display size.
 * Currently rewrites Google Places/usercontent URLs (lh3.googleusercontent.com)
 * which are stored at huge sizes (e.g. =s4800-w1600). We swap the size suffix
 * to a smaller one that matches the rendered dimensions, which can shrink
 * payloads from ~1MB to ~30-80KB per image.
 */
export function optimizeImageUrl(
  url: string | undefined,
  opts: { width?: number; height?: number } = {},
): string | undefined {
  if (!url) return url;

  // Google user content (Places photos)
  if (/(^|\.)googleusercontent\.com\//i.test(url)) {
    const w = opts.width ?? 600;
    const h = opts.height ?? Math.round((w * 3) / 4);
    // Strip any existing =sNNN-wNNN-hNNN suffix and add ours
    const base = url.replace(/=[^/?#]+$/, "");
    return `${base}=w${w}-h${h}-c-rw`;
  }

  return url;
}
