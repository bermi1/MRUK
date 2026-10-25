import localFont from 'next/font/local';

/**
 * Brand display faces, self-hosted from @fontsource-variable (latin subset, CSP font-src 'self').
 * Each declares a CSS variable only; a browser downloads a file only when a rendered element
 * uses that family, so Mr UK pages never fetch Fraunces and Skywood pages never fetch Archivo.
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
  src: [
    { path: '../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2', weight: '100 900', style: 'normal' },
    { path: '../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-fraunces',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});
