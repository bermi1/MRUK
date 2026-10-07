import type { CSSProperties } from 'react';
import type { BrandView } from './types';

/** Brand tokens as CSS variables (README design tokens). */
export function themeVars(b: BrandView): CSSProperties {
  return {
    ['--p' as string]: b.primary,
    ['--d' as string]: b.dark,
    ['--soft' as string]: b.soft,
    ['--ink' as string]: b.ink,
    ['--acc' as string]: b.accent,
    ['--hi' as string]: b.hi,
    ['--r' as string]: b.r,
    ['--rs' as string]: b.rs,
    ['--head' as string]: b.head,
    ['--track' as string]: b.track,
  };
}
