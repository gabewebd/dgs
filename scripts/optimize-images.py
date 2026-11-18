#!/usr/bin/env python3
"""
DIGITAL GROWTHSCALE: IMAGE OPTIMIZER
------------------------------------------------------------
GHL's media library (assets.cdn.filesafe.space) serves images exactly
as uploaded, and most of ours are ~2 MB 1536x1024 PNG photos. This
script finds every PNG/JPG from the media library that the site
references, saves a WebP copy in images/opt/<media-id>.webp (served by
the Vercel asset CDN), and rewrites the references to point at it:

  css/styles.css   -> ../images/opt/<id>.webp   (relative: resolves to
                      the CDN when styles.css is loaded from the CDN)
  *.html, main.js  -> https://dgs-omega.vercel.app/images/opt/<id>.webp
                      (absolute, because pages are pasted into GHL)

Safe to re-run after uploading new images to GHL: already-converted
images are skipped, and only references that still point at the media
library are rewritten. Requires Pillow (pip install pillow).

  python scripts/optimize-images.py            # convert + rewrite
  python scripts/optimize-images.py --dry-run  # report only
"""
import io
import os
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'images', 'opt')
CDN = 'https://dgs-omega.vercel.app'

MAX_SIDE = 2000      # longest edge; our photos are 1536 wide, so most keep full size
QUALITY = 80         # WebP quality: visually identical to the PNGs at ~5-10% of the size
MIN_SAVING = 0.30    # only swap when the WebP is at least 30% smaller

URL_RE = re.compile(
    r'https://assets\.cdn\.filesafe\.space/[A-Za-z0-9]+/media/([a-z0-9]+)\.(?:png|jpe?g)',
    re.IGNORECASE)

SKIP_DIRS = {'node_modules', '.git', 'html-templates', '.netlify', '.claude',
             '.agents', '.gemini', '.kilo', 'scratch'}
# Legacy stylesheets kept only for old GHL pages: leave them untouched.
SKIP_FILES = {'dgs-header-test.css', 'dgs-launching-soon.css'}


def target_files():
    files = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name in SKIP_FILES:
                continue
            if name.endswith('.html') or name in ('styles.css', 'main.js'):
                files.append(os.path.join(dirpath, name))
    return files


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'dgs-image-optimizer'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def convert(media_id, url):
    """Return (media_id, original_bytes, webp_bytes or None, note)."""
    out = os.path.join(OUT_DIR, media_id + '.webp')
    if os.path.exists(out):
        return media_id, None, os.path.getsize(out), 'exists'
    try:
        raw = fetch(url)
        im = Image.open(io.BytesIO(raw))
        im.load()
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGBA' if 'A' in im.getbands() or 'transparency' in im.info else 'RGB')
        if max(im.size) > MAX_SIDE:
            im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=QUALITY, method=6)
        data = buf.getvalue()
        if len(data) > len(raw) * (1 - MIN_SAVING):
            return media_id, len(raw), None, 'kept original (WebP not smaller enough)'
        if '--dry-run' not in sys.argv:
            with open(out, 'wb') as f:
                f.write(data)
        return media_id, len(raw), len(data), 'converted'
    except Exception as e:  # network or decode problem: leave this image alone
        return media_id, None, None, 'ERROR ' + str(e)[:80]


def main():
    dry = '--dry-run' in sys.argv
    os.makedirs(OUT_DIR, exist_ok=True)
    files = target_files()
    found = {}
    for path in files:
        with open(path, encoding='utf-8', newline='') as f:
            for m in URL_RE.finditer(f.read()):
                found.setdefault(m.group(1), m.group(0))

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda kv: convert(*kv), found.items()))

    ready = set()
    before = after = 0
    for media_id, orig, webp, note in sorted(results, key=lambda r: -(r[1] or 0)):
        if webp:
            ready.add(media_id)
        if orig and webp:
            before += orig
            after += webp
        if note != 'exists':
            print('%-26s %8s -> %8s  %s' % (
                media_id, '%dKB' % (orig // 1024) if orig else '-',
                '%dKB' % (webp // 1024) if webp else '-', note))
    if before:
        print('\nconverted: %.1f MB -> %.1f MB' % (before / 1048576, after / 1048576))

    if dry:
        print('dry run: no files rewritten')
        return

    changed = 0
    for path in files:
        with open(path, encoding='utf-8', newline='') as f:
            src = f.read()
        is_css = path.endswith('.css')

        def repl(m):
            mid = m.group(1)
            if mid not in ready:
                return m.group(0)
            return ('../images/opt/' if is_css else CDN + '/images/opt/') + mid + '.webp'

        new = URL_RE.sub(repl, src)
        if new != src:
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(new)
            changed += 1
    print('rewrote references in %d files' % changed)


if __name__ == '__main__':
    main()
