#!/usr/bin/env bash
# Renders the Handoff Gap post graphics (src/*.html) to WebP in images/blog/handoff-gap/.
# Needs Chrome and Python with Pillow. Run from anywhere:  bash docs/ghl-blog/handoff-gap/render.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
OUT="$ROOT/images/blog/handoff-gap"
TMP="$HERE/.png"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
mkdir -p "$OUT" "$TMP"

# name width height
while read -r name w h; do
  [ -z "$name" ] && continue
  src="$(cygpath -m "$HERE/src/$name.html")"
  png="$(cygpath -w "$TMP/$name.png")"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --window-size="$w,$h" --virtual-time-budget=8000 --screenshot="$png" "file:///$src" >/dev/null 2>&1
  echo "rendered $name"
done <<'EOF'
cover 1200 630
fig-1-leak-map 1600 620
fig-2-score 1600 580
fig-3-anatomy 1600 540
fig-4-handoff-map 1600 700
fig-5-client-trace 1600 700
EOF

python - "$TMP" "$OUT" <<'PY'
import sys, os
from PIL import Image
tmp, out = sys.argv[1], sys.argv[2]
for f in sorted(os.listdir(tmp)):
    if not f.endswith('.png'): continue
    im = Image.open(os.path.join(tmp, f)).convert('RGB')
    target = 1600  # 2x of an 800px column; cover becomes 1600x840
    im = im.resize((target, round(im.height * target / im.width)), Image.LANCZOS)
    dst = os.path.join(out, f[:-4] + '.webp')
    im.save(dst, 'WEBP', quality=88, method=6)
    print(f"{os.path.basename(dst)}  {im.width}x{im.height}  {os.path.getsize(dst)//1024} KB")
PY
