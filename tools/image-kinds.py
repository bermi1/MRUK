"""Classify bundled product photos for display (run after adding photos to apps/web/public/img/products).

  python3 tools/image-kinds.py

Writes apps/web/src/lib/image-kinds.json:
  flat  = opaque photo on a white background (blend into the tile, no drop shadow)
  photo = opaque photo on a coloured background (fill the frame)
Cut-outs with transparency are the default and are not listed.
"""
import glob, json, os
from PIL import Image, ImageStat

ROOT = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web')
PUB = os.path.join(ROOT, 'public')
out = {'flat': [], 'photo': []}
for f in sorted(glob.glob(os.path.join(PUB, 'img', 'products', '**', '*.*'), recursive=True)):
    im = Image.open(f)
    if im.mode in ('RGBA', 'LA') and im.getchannel('A').getextrema()[0] < 250:
        continue
    rgb = im.convert('RGB')
    w, h = rgb.size
    edge = [rgb.crop(b) for b in ((0, 0, w, 4), (0, h - 4, w, h), (0, 0, 4, h), (w - 4, 0, w, h))]
    mean = [sum(ImageStat.Stat(e).mean[c] for e in edge) / 4 for c in range(3)]
    url = '/' + os.path.relpath(f, PUB).replace(os.sep, '/')
    out['flat' if min(mean) > 232 else 'photo'].append(url)
dest = os.path.join(ROOT, 'src', 'lib', 'image-kinds.json')
with open(dest, 'w') as fh:
    json.dump(out, fh, indent=0)
print(f"flat {len(out['flat'])}, photo {len(out['photo'])} -> {dest}")
