// Resolve relative URLs as the chapter reader does, never using a browser global.
export function legacyImagePath(value: unknown, origin?: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const base = new URL('/chapters/', origin || 'https://handbook.invalid');
    const url = new URL(value, base);
    if (url.origin !== base.origin || !['https:', 'http:'].includes(url.protocol)) return null;
    // Only decode unreserved characters; an encoded separator is not a path boundary.
    const path = url.pathname.replace(/%[\da-f]{2}/gi, match => {
      const char = String.fromCharCode(parseInt(match.slice(1), 16));
      return /^[\w.~-]$/.test(char) ? char : match.toUpperCase();
    });
    return path.startsWith('/assets/screenshots/') ? path : null;
  } catch {
    return null;
  }
}

export function isLegacyImageUrl(value: unknown, origin?: string): boolean {
  return legacyImagePath(value, origin) !== null;
}
