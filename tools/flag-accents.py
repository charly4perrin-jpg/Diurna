"""Calcule une couleur d'accent par pays à partir de son drapeau (à relancer rarement).

    python3 tools/flag-accents.py   (nécessite Playwright et Pillow)

On rend chaque drapeau en petit, on prend la couleur saturée qui couvre la plus grande surface,
puis on l'éclaircit jusqu'à un contraste d'au moins 4,5:1 sur le fond de nuit du site (AA).
Résultat : tools/flag-accents.json, lu par tools/countries.mjs.
"""
import colorsys, io, json, pathlib
from collections import Counter
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
FLAGS = ROOT / 'assets' / 'flags'
BG = (0x0C, 0x15, 0x31)  # --night-1, le fond des fiches

def lum(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(x) for x in c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

def lift(c, target=4.6):
    h, l, s = colorsys.rgb_to_hls(*(x / 255 for x in c))
    s = min(s, 0.85)
    while l < 0.95:
        rgb = tuple(round(x * 255) for x in colorsys.hls_to_rgb(h, l, s))
        if contrast(rgb, BG) >= target:
            return rgb
        l += 0.01
    return tuple(round(x * 255) for x in colorsys.hls_to_rgb(h, 0.8, s))

def dominant(img):
    px = [p[:3] for p in img.convert('RGBA').getdata() if p[3] > 200]
    buckets = Counter()
    for r, g, b in px:
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if s < 0.25 or l < 0.12 or l > 0.9:
            continue  # blanc, noir, gris : pas une couleur d'accent
        buckets[(r // 24, g // 24, b // 24)] += 1
    if not buckets:
        return None
    key, _ = buckets.most_common(1)[0]
    sel = [p for p in px if (p[0] // 24, p[1] // 24, p[2] // 24) == key]
    return tuple(round(sum(p[i] for p in sel) / len(sel)) for i in range(3))

out = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 80, 'height': 60})
    for f in sorted(FLAGS.iterdir()):
        if f.suffix == '.svg':
            pg.set_content(f'<html><body style="margin:0">{f.read_text().replace("<svg ", "<svg width=80 height=60 preserveAspectRatio=none ", 1)}</body></html>')
            img = Image.open(io.BytesIO(pg.screenshot(clip={'x': 0, 'y': 0, 'width': 80, 'height': 60})))
        elif f.suffix == '.webp':
            img = Image.open(f).resize((80, 60))
        else:
            continue
        d = dominant(img)
        if d:
            out[f.stem] = '#%02X%02X%02X' % lift(d)
    b.close()
(ROOT / 'tools' / 'flag-accents.json').write_text(json.dumps(out, indent=0, sort_keys=True) + '\n')
print(len(out), 'accents', {k: out.get(k) for k in ['us', 'ir', 'ua', 'il', 'sd', 'jp', 'br', 'fr']})
