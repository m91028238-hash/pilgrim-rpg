# Renders the foliage atlas (see bake_foliage.html) and post-processes it (edge bleed, poppies, webp).
import base64, json, io, random, sys
from playwright.sync_api import sync_playwright
from PIL import Image, ImageFilter, ImageDraw
OUT = sys.argv[1] if len(sys.argv) > 1 else '/workspace/pilgrim-rpg/assets/tex/foliage.webp'
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    p = b.new_page(viewport={'width': 600, 'height': 600})
    p.on('console', lambda m: print('console', m.text)); p.on('pageerror', lambda e: print('ERR', e))
    import time; p.goto('http://localhost:8932/bake.html?t=%d' % time.time()); p.wait_for_function('window.ready', timeout=60000)
    r = p.evaluate('bake()')
    im = Image.open(io.BytesIO(base64.b64decode(r['png'].split(',')[1]))).convert('RGBA')
    json.dump(r['meta'], open('/tmp/foliage_meta.json', 'w'))
import math
T = 512; rnd = random.Random(7); d = ImageDraw.Draw(im)
def flowers(tile, n, col, centre, r0a, r0b, petals, y0, y1):
    tx, ty = (tile % 4) * T, (tile // 4) * T
    for k in range(n):
        x = tx + 40 + rnd.random() * (T - 80); y = ty + y0 + rnd.random() * (y1 - y0); r0 = r0a + rnd.random() * (r0b - r0a)
        d.line([(x, y), (x + rnd.uniform(-10, 10), ty + T - 2)], fill=(62, 88, 38, 255), width=3)
        for a in range(petals):
            ang = a * 6.283 / petals + k; ox = math.cos(ang) * r0 * 0.6; oy = math.sin(ang) * r0 * 0.38
            c = tuple(max(0, min(255, v + rnd.randint(-18, 18))) for v in col) + (255,)
            d.ellipse([x + ox - r0 * 0.55, y + oy - r0 * 0.35, x + ox + r0 * 0.55, y + oy + r0 * 0.35], fill=c)
        d.ellipse([x - r0 * 0.22, y - r0 * 0.2, x + r0 * 0.22, y + r0 * 0.2], fill=centre + (255,))
meta = {m['i']: m for m in r['meta']}
for i, m in meta.items():
    if m['paint'] == 'poppy': flowers(i, 13, (205, 30, 24), (28, 20, 18), 11, 19, 5, 200, 380)
    if m['paint'] == 'daisy': flowers(i, 16, (240, 238, 228), (226, 180, 40), 8, 13, 9, 290, 420)
# edge bleed so mip-mapped alpha-tested cards have no dark halos
a = im.getchannel('A'); rgb = im.convert('RGB')
solid = a.point(lambda v: 255 if v > 100 else 0)
acc = Image.new('RGB', im.size, (60, 80, 40)); acc.paste(rgb, mask=solid)
for rad in (2, 4, 8, 16, 32):
    bl = acc.filter(ImageFilter.BoxBlur(rad)); m = solid.filter(ImageFilter.BoxBlur(rad)).point(lambda v: 255 if v > 0 else 0)
    tmp = bl.copy(); tmp.paste(acc, mask=solid); acc = tmp
    solid = Image.composite(Image.new('L', im.size, 255), solid, m)
acc.paste(rgb, mask=a.point(lambda v: 255 if v > 100 else 0))
out = acc.convert('RGBA'); out.putalpha(a)
out = out.resize((1024, 1024), Image.LANCZOS)
out.save(OUT, 'WEBP', quality=86, method=6)
out.save('/tmp/foliage_preview.png')
print('wrote', OUT, r['meta'])
