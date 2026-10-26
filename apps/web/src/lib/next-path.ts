/** Only allow redirects back into this store (relative path, no protocol-relative "//"). */
export function safeNext(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  return /^\/(?!\/)[A-Za-z0-9\-._~/?=&%#]*$/.test(v) && !v.includes('\\') ? v : fallback;
}
