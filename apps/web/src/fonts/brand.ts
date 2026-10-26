import localFont from 'next/font/local';

/**
 * Brand display faces, self-hosted from @fontsource-variable (latin subset, CSP font-src 'self').
 * Each declares a CSS variable only; a browser downloads a file only when a rendered element
 * uses that family, so Mr UK pages never fetch Outfit and Skywood pages never fetch Archivo.
 * preload is off: both brands share one layout, and preloading would push both brands' fonts
 * to every page. Size-adjusted fallbacks (adjustFontFallback) keep the swap free of layout shift.
 */
export const archivo = localFont({
  src: '../../node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2',
  variable: '--font-archivo',
  weight: '100 900',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Arial', 'sans-serif'],
});

export const fraunces = localFont({
  // Skywood display face: Outfit, a clean modern geometric sans (export name kept for existing imports).
  src: [{ path: '../../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-fraunces',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Arial', 'sans-serif'],
})
