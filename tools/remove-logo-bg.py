#!/usr/bin/env python3
"""Remove the flat white background from a logo and save a trimmed transparent PNG.

Usage: python3 tools/remove-logo-bg.py input.png output.png [--pad 8] [--no-trim]

How it works
1. Near-white pixels connected to the image border are background (flood fill),
   so white shapes *inside* a logo (white text on a navy shield, the white
   "ANIA" lettering on the Azania blue) are kept.
2. Enclosed near-white islands whose surrounding ring is neutral dark (black or
   grey outlines, i.e. letter counters like the holes in "o", "d", "A", "B")
   are also background.
3. Anti-aliased edge pixels are un-blended from white: alpha is estimated
   against the nearest solid foreground colour, so edges stay smooth on any
   background colour without a white halo.
4. The result is trimmed to its content with a small transparent padding.

Requires: pillow, numpy, scipy.
"""
import argparse

import numpy as np
from PIL import Image
from scipy import ndimage

WHITE_MIN = 232      # min(r,g,b) at or above this is "near white"
EDGE_BAND = 3        # pixels around the background treated as anti-aliased edge


def remove_bg(img: Image.Image, pad: int, trim: bool = True) -> Image.Image:
    rgba = np.asarray(img.convert("RGBA")).astype(np.float64)
    rgb, a_in = rgba[..., :3], rgba[..., 3] / 255.0
    h, w = a_in.shape
    near_white = (rgb.min(axis=2) >= WHITE_MIN) | (a_in < 0.05)

    # 1. Border-connected white is background.
    labels, n = ndimage.label(near_white)
    border = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
    border.discard(0)
    bg = np.isin(labels, list(border))

    # 2. Enclosed white islands ringed by neutral dark pixels (letter counters).
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    neutral_dark = (chroma < 40) & (rgb.max(axis=2) < 150)
    for lab in range(1, n + 1):
        if lab in border:
            continue
        comp = labels == lab
        ring = ndimage.binary_dilation(comp, iterations=3) & ~ndimage.binary_dilation(comp, iterations=1) & ~near_white
        if ring.sum() == 0:
            continue
        if neutral_dark[ring].mean() > 0.6:
            bg |= comp

    # 3. Soft edges: un-blend pixels in a band around the background.
    solid = ~bg & ~ndimage.binary_dilation(bg, iterations=EDGE_BAND)
    band = ~bg & ~solid
    alpha = np.where(bg, 0.0, 1.0)
    out_rgb = rgb.copy()
    if solid.any() and band.any():
        _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
        fg = rgb[iy, ix]                                 # nearest solid colour
        white = np.full(3, 255.0)
        denom = np.linalg.norm(fg - white, axis=2)
        num = np.linalg.norm(rgb - white, axis=2)
        est = np.clip(np.where(denom > 1e-3, num / np.maximum(denom, 1e-3), 1.0), 0, 1)
        alpha = np.where(band, est, alpha)
        # Recover the foreground colour: C = a*F + (1-a)*W  =>  F = (C - (1-a)W) / a
        a3 = np.maximum(alpha[..., None], 1e-3)
        unblended = np.clip((rgb - (1 - a3) * white) / a3, 0, 255)
        out_rgb = np.where(band[..., None], unblended, out_rgb)

    alpha = alpha * a_in
    out = np.dstack([out_rgb, alpha * 255]).round().astype(np.uint8)
    res = Image.fromarray(out, "RGBA")

    # 4. Trim to content.
    ys, xs = np.where(alpha > 0.02)
    if trim and len(xs):
        box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, w), min(ys.max() + pad + 1, h))
        res = res.crop(box)
    return res


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--pad", type=int, default=8)
    ap.add_argument("--no-trim", action="store_true", help="keep the original canvas size")
    args = ap.parse_args()
    remove_bg(Image.open(args.src), args.pad, not args.no_trim).save(args.dst, optimize=True)


if __name__ == "__main__":
    main()
