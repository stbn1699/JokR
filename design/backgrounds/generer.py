"""
Génère les fonds en images de JokR en SVG 1920×1080 (16:9), à retoucher dans Figma : paysages, espace, casino, saisons.
Sur le site, l'image couvre l'écran (recadrée sur les bords) sous un voile sombre : l'essentiel reste vers le centre.
Pas de filtre de bruit ni de texte sur un chemin (Figma ne les reprend pas) ; les flous (feGaussianBlur) deviennent
des flous de calque. Calques nommés.

Usage : python generer.py <dossier de sortie>   (ex. python design/backgrounds/generer.py design/backgrounds)
Attention : relancer le script écrase les fichiers du dossier de sortie.
Pour la boutique : copier une série dans public/backgrounds/<série>/ (nom et prix dans backend/src/utils/backgroundSets.ts).
"""
import math
import os
import random
import sys

OUT = sys.argv[1]
W, H = 1920, 1080


# ---------------------------------------------------------------- Outils
def lin(id_, stops, x1=0, y1=0, x2=0, y2=H):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"{"" if a is None else f" stop-opacity=\"{a}\""}/>' for o, c, a in _stops(stops))
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" gradientUnits="userSpaceOnUse">{s}</linearGradient>'


def rad(id_, stops, cx, cy, r):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"{"" if a is None else f" stop-opacity=\"{a}\""}/>' for o, c, a in _stops(stops))
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="{r}" gradientUnits="userSpaceOnUse">{s}</radialGradient>'


def _stops(stops):
    return [(s[0], s[1], s[2] if len(s) > 2 else None) for s in stops]


def blur(id_, sd):
    return f'<filter id="{id_}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{sd}"/></filter>'


def ridge(base, amp, seed, color, step=60, bottom=H, smooth=True, extra=""):
    """Une ligne de crêtes (dunes, collines, montagnes) remplie jusqu'en bas."""
    rnd = random.Random(seed)
    pts = []
    y = base
    for x in range(-step, W + 2 * step, step):
        y = base + rnd.uniform(-amp, amp) if smooth else y + rnd.uniform(-amp, amp) * 0.9
        y = min(max(y, base - amp * 1.4), base + amp * 1.4)
        pts.append((x, y))
    d = f"M{pts[0][0]} {bottom} L{pts[0][0]} {pts[0][1]:.0f}"
    if smooth:
        for i in range(1, len(pts)):
            mx = (pts[i - 1][0] + pts[i][0]) / 2
            d += f" Q{pts[i - 1][0]} {pts[i - 1][1]:.0f} {mx:.0f} {(pts[i - 1][1] + pts[i][1]) / 2:.0f}"
    else:
        d += "".join(f" L{x} {y:.0f}" for x, y in pts[1:])
    d += f" L{pts[-1][0]} {bottom} Z"
    return f'<path d="{d}" fill="{color}"{extra}/>'


def stars(n, seed, y_max=H, r=(0.8, 2.4), color="white"):
    rnd = random.Random(seed)
    return "\n".join(f'  <circle cx="{rnd.uniform(0, W):.0f}" cy="{rnd.uniform(0, y_max):.0f}" r="{rnd.uniform(*r):.1f}" '
                     f'fill="{color}" fill-opacity="{rnd.uniform(0.35, 1):.2f}"/>' for _ in range(n))


def fir(x, y, h, color, snow=None):
    """Sapin en trois étages (pointe en haut, pied en (x, y))."""
    w = h * 0.42
    parts = []
    for k, (top, bot, width) in enumerate([(0, 0.45, 0.6), (0.22, 0.72, 0.8), (0.45, 0.95, 1)]):
        parts.append(f"M{x} {y - h + top * h:.0f} L{x + w * width:.0f} {y - h + bot * h:.0f} L{x - w * width:.0f} {y - h + bot * h:.0f} Z")
    tree = f'<path d="{" ".join(parts)}" fill="{color}"/><rect x="{x - h * 0.04:.0f}" y="{y - h * 0.06:.0f}" width="{h * 0.08:.0f}" height="{h * 0.08:.0f}" fill="{color}"/>'
    if snow:
        tree += f'<path d="M{x} {y - h:.0f} L{x + w * 0.25:.0f} {y - h * 0.8:.0f} L{x - w * 0.25:.0f} {y - h * 0.8:.0f} Z" fill="{snow}"/>'
    return tree


def page(defs, body):
    return (f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" fill="none" xmlns="http://www.w3.org/2000/svg">\n'
            f'<defs>\n{defs}\n</defs>\n{body}\n</svg>\n')


def write(folder, slug, content):
    os.makedirs(os.path.join(OUT, folder), exist_ok=True)
    with open(os.path.join(OUT, folder, f"{slug}.svg"), "w", encoding="utf8") as f:
        f.write(content)


# ---------------------------------------------------------------- Paysages minimalistes
def desert():
    defs = lin("ciel", [(0, "#2b1055"), (0.55, "#d5426b"), (1, "#ffb15c")]) + rad("soleil", [(0, "#fff1c1"), (1, "#ffb15c")], 960, 640, 200)
    body = f'''<rect id="ciel" width="{W}" height="{H}" fill="url(#ciel)"/>
<circle id="soleil" cx="960" cy="660" r="200" fill="url(#soleil)"/>
<g id="dunes">
  {ridge(700, 50, 1, "#c8553d", step=240)}
  {ridge(790, 45, 2, "#9a3b3b", step=300)}
  {ridge(900, 40, 3, "#5c2335", step=360)}
  {ridge(1000, 30, 4, "#2e1428", step=420)}
</g>'''
    return page(defs, body)


def mountains():
    defs = lin("ciel", [(0, "#1e2a5a"), (0.6, "#e9a6b8"), (1, "#ffd9b0")])
    birds = "".join(f'<path d="M{x} {y} q14 -12 28 0 q14 -12 28 0" stroke="#2a2440" stroke-width="4"/>' for x, y in [(1280, 260), (1350, 300), (1220, 320)])
    body = f'''<rect id="ciel" width="{W}" height="{H}" fill="url(#ciel)"/>
<g id="montagnes">
  {ridge(520, 140, 11, "#a98fb8", step=160, smooth=False)}
  {ridge(640, 110, 12, "#7b6a9c", step=140, smooth=False)}
  {ridge(760, 90, 13, "#4e4877", step=120, smooth=False)}
  {ridge(880, 70, 14, "#2c2a4f", step=110, smooth=False)}
  {ridge(990, 40, 15, "#17162e", step=200)}
</g>
<g id="oiseaux">{birds}</g>'''
    return page(defs, body)


def ocean_night():
    defs = lin("ciel", [(0, "#020617"), (0.6, "#14244a")], y2=650) + lin("mer", [(0, "#0d1b3a"), (1, "#020617")], y1=650) + \
        rad("halo", [(0, "#f5f3c8", 0.45), (1, "#f5f3c8", 0)], 1300, 300, 260) + blur("flou", 6)
    rnd = random.Random(21)
    glints = "\n".join(f'  <rect x="{1300 - w / 2 + rnd.uniform(-30, 30):.0f}" y="{y}" width="{w:.0f}" height="5" rx="2.5" fill="#f5f3c8" fill-opacity="{0.8 - (y - 660) / 600:.2f}"/>'
                       for y, w in [(660 + i * 22, rnd.uniform(40, 200) * (1 + i / 12)) for i in range(18)])
    waves = "\n".join(f'  <path d="M{x} {y} q30 -10 60 0" stroke="#3b5b9a" stroke-opacity="0.5" stroke-width="3"/>'
                      for x, y in [(rnd.uniform(0, W), rnd.uniform(700, 1060)) for _ in range(40)])
    body = f'''<rect id="ciel" width="{W}" height="650" fill="url(#ciel)"/>
<g id="etoiles">
{stars(160, 22, 600)}
</g>
<circle id="halo" cx="1300" cy="300" r="260" fill="url(#halo)"/>
<circle id="lune" cx="1300" cy="300" r="90" fill="#f5f3c8"/>
<rect id="mer" y="650" width="{W}" height="430" fill="url(#mer)"/>
<g id="reflet" filter="url(#flou)">
{glints}
</g>
<g id="vagues">
{waves}
</g>'''
    return page(defs, body)


def misty_forest():
    defs = lin("ciel", [(0, "#c9d6d2"), (1, "#7f9a93")]) + lin("brume", [(0, "#e6efec", 0), (1, "#e6efec", 0.85)], y1=0, y2=140)
    layers = []
    for k, (base, h, color) in enumerate([(560, 230, "#8fa79f"), (700, 280, "#62807a"), (850, 330, "#3c5953"), (1040, 400, "#1c312d")]):
        rnd = random.Random(30 + k)
        trees = "".join(fir(x + rnd.uniform(-20, 20), base + rnd.uniform(-20, 20), h * rnd.uniform(0.75, 1.1), color)
                        for x in range(-40, W + 80, int(h * 0.38)))
        layers.append(f'<g id="arbres-{k + 1}">{trees}<rect y="{base - 10}" width="{W}" height="{H - base + 10}" fill="{color}"/></g>')
        if k < 3:
            layers.append(f'<rect id="brume-{k + 1}" y="{base - 100}" width="{W}" height="140" fill="url(#brume)"/>')
    body = f'<rect id="ciel" width="{W}" height="{H}" fill="url(#ciel)"/>\n' + "\n".join(layers)
    return page(defs, body)


def lake():
    defs = lin("ciel", [(0, "#8ec5fc"), (0.6, "#fbd3e9"), (1, "#ffe8c7")], y2=600) + lin("lac", [(0, "#d7b8d6"), (1, "#5a6fa8")], y1=600)
    back = ridge(470, 120, 41, "#8b7fb3", step=150, smooth=False, bottom=600)
    front = ridge(540, 80, 42, "#5c5a8f", step=130, smooth=False, bottom=600)
    body = f'''<rect id="ciel" width="{W}" height="600" fill="url(#ciel)"/>
<g id="montagnes">{back}{front}</g>
<rect id="lac" y="600" width="{W}" height="480" fill="url(#lac)"/>
<g id="reflet" opacity="0.35" transform="translate(0 1200) scale(1 -1)">{back}{front}</g>
<path id="rive" d="M0 1000 Q480 950 960 990 T1920 980 V1080 H0 Z" fill="#2b2d4f"/>'''
    return page(defs, body)


def hills():
    defs = lin("ciel", [(0, "#ffcf8b"), (1, "#ffe9c4")]) + rad("soleil", [(0, "#fff7e0"), (1, "#ffd27a")], 560, 360, 120)
    body = f'''<rect id="ciel" width="{W}" height="{H}" fill="url(#ciel)"/>
<circle id="soleil" cx="560" cy="360" r="120" fill="url(#soleil)"/>
<g id="collines">
  {ridge(620, 60, 51, "#b7c97a", step=420)}
  {ridge(720, 60, 52, "#8fb05a", step=380)}
  {ridge(830, 55, 53, "#5f8f45", step=340)}
  {ridge(950, 45, 54, "#3a6b38", step=300)}
</g>'''
    return page(defs, body)


# ---------------------------------------------------------------- Espace
def nebula():
    defs = blur("nuage", 90) + blur("nuage-fin", 40)
    clouds = "\n".join(f'  <ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{c}" fill-opacity="{o}" transform="rotate({r} {x} {y})"/>'
                       for x, y, rx, ry, c, o, r in [(700, 500, 520, 260, "#7b2ff7", 0.55, -20), (1150, 560, 480, 240, "#f72585", 0.45, 15),
                                                     (960, 420, 360, 200, "#4cc9f0", 0.35, 0), (1400, 380, 300, 180, "#7209b7", 0.5, -10),
                                                     (520, 700, 320, 160, "#3a0ca3", 0.6, 10)])
    body = f'''<rect id="espace" width="{W}" height="{H}" fill="#05030f"/>
<g id="nebuleuse" filter="url(#nuage)">
{clouds}
</g>
<g id="filaments" filter="url(#nuage-fin)">
  <path d="M500 600 Q900 300 1400 500" stroke="#ffb3e6" stroke-opacity="0.35" stroke-width="40"/>
</g>
<g id="etoiles">
{stars(260, 61)}
</g>'''
    return page(defs, body)


def aurora():
    defs = lin("ciel", [(0, "#020617"), (1, "#0b1d33")]) + blur("voile", 9) + \
        ('<linearGradient id="rayon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98cff" stop-opacity="0"/>'
         '<stop offset="0.35" stop-color="#3dffb0" stop-opacity="0.9"/><stop offset="1" stop-color="#1fb5ff" stop-opacity="0"/></linearGradient>')
    # rideaux : de fins rayons verticaux posés le long de deux lignes ondulées
    rnd_rays = random.Random(70)
    rays = []
    for top, amp, phase, length in [(260, 90, 0, 360), (360, 70, 2.1, 300)]:
        for x in range(150, 1800, 14):
            y = top + amp * math.sin(x / 260 + phase) + 30 * math.sin(x / 90)
            rays.append(f'  <rect x="{x}" y="{y:.0f}" width="10" height="{length * rnd_rays.uniform(0.7, 1.2):.0f}" '
                        f'fill="url(#rayon)" fill-opacity="{rnd_rays.uniform(0.35, 0.9):.2f}"/>')
    curtains = "\n".join(rays)
    rnd = random.Random(71)
    forest = "".join(fir(x, 1080, rnd.uniform(110, 190), "#03070f") for x in range(-20, W + 40, 55))
    body = f'''<rect id="ciel" width="{W}" height="{H}" fill="url(#ciel)"/>
<g id="etoiles">
{stars(200, 72, 900)}
</g>
<g id="aurore" filter="url(#voile)">
{curtains}
</g>
<g id="montagnes">{ridge(880, 70, 73, "#050b18", step=160, smooth=False)}</g>
<g id="foret">{forest}</g>'''
    return page(defs, body)


def starry_sky():
    defs = lin("ciel", [(0, "#020617"), (0.7, "#1a1f4d"), (1, "#3d2a5c")]) + blur("voie", 60)
    rnd = random.Random(81)
    # la Voie lactée : une bande floue et beaucoup de petites étoiles le long de la diagonale
    band_stars = "\n".join(f'  <circle cx="{x:.0f}" cy="{(1000 - x * 0.45) + rnd.gauss(0, 70):.0f}" r="{rnd.uniform(0.6, 1.8):.1f}" fill="white" fill-opacity="{rnd.uniform(0.3, 0.9):.2f}"/>'
                           for x in [rnd.uniform(0, W) for _ in range(500)])
    body = f'''<rect id="ciel" width="{W}" height="{H}" fill="url(#ciel)"/>
<g id="voie-lactee" filter="url(#voie)">
  <path d="M-100 1050 L2020 100" stroke="#c9b8ff" stroke-opacity="0.35" stroke-width="220"/>
  <path d="M-100 1050 L2020 100" stroke="#fff1d6" stroke-opacity="0.25" stroke-width="90"/>
</g>
<g id="etoiles">
{stars(220, 82)}
{band_stars}
</g>
<g id="collines">{ridge(960, 50, 83, "#07081a", step=320)}</g>'''
    return page(defs, body)


def galaxy():
    defs = rad("coeur", [(0, "#fff4d6", 1), (0.3, "#ffb4e1", 0.6), (1, "#3b1d6e", 0)], 960, 540, 380) + blur("lueur", 6)
    rnd = random.Random(91)
    dots = []
    for arm in range(2):
        for i in range(700):
            t = i / 700 * 3.2 * math.pi
            r = 30 + 55 * t
            a = t + arm * math.pi + rnd.gauss(0, 0.18)
            x = 960 + r * math.cos(a) * 1.35
            y = 540 + r * math.sin(a) * 0.75
            c = rnd.choice(["#ffffff", "#c7d2fe", "#f5d0fe", "#bae6fd"])
            dots.append(f'  <circle cx="{x:.0f}" cy="{y:.0f}" r="{rnd.uniform(0.8, 2.6):.1f}" fill="{c}" fill-opacity="{max(0.2, 1 - i / 900):.2f}"/>')
    body = f'''<rect id="espace" width="{W}" height="{H}" fill="#04020c"/>
<g id="etoiles">
{stars(150, 92)}
</g>
<ellipse id="coeur" cx="960" cy="540" rx="520" ry="300" fill="url(#coeur)"/>
<g id="bras" filter="url(#lueur)">
{chr(10).join(dots)}
</g>'''
    return page(defs, body)


def eclipse():
    defs = rad("couronne", [(0.55, "#ffe6a8", 0.9), (0.75, "#ff9a3c", 0.35), (1, "#ff9a3c", 0)], 960, 520, 360) + blur("eclat", 25)
    rays = "\n".join(f'  <path d="M960 520 L{960 + 420 * math.cos(math.radians(a)):.0f} {520 + 420 * math.sin(math.radians(a)):.0f}" stroke="#ffd58a" stroke-opacity="0.25" stroke-width="{w}"/>'
                     for a, w in [(a, random.Random(a).uniform(6, 22)) for a in range(0, 360, 15)])
    body = f'''<rect id="espace" width="{W}" height="{H}" fill="#020208"/>
<g id="etoiles">
{stars(180, 101)}
</g>
<g id="rayons" filter="url(#eclat)">
{rays}
</g>
<circle id="couronne" cx="960" cy="520" r="360" fill="url(#couronne)"/>
<circle id="lune" cx="960" cy="520" r="190" fill="#020208"/>
<circle id="diamant" cx="1110" cy="410" r="14" fill="white" filter="url(#eclat)"/>'''
    return page(defs, body)


def planet_rise():
    defs = rad("planete", [(0, "#4f8de0"), (0.7, "#1d3f8a"), (1, "#0b1a40")], 700, 1100, 900) + \
        rad("atmosphere", [(0.82, "#7cc4ff", 0), (0.9, "#7cc4ff", 0.6), (1, "#7cc4ff", 0)], 960, 1700, 1000) + \
        '<clipPath id="disque-planete"><circle cx="960" cy="1700" r="900"/></clipPath>'
    body = f'''<rect id="espace" width="{W}" height="{H}" fill="#03040d"/>
<g id="etoiles">
{stars(240, 111, 800)}
</g>
<circle id="atmosphere" cx="960" cy="1700" r="1000" fill="url(#atmosphere)"/>
<circle id="planete" cx="960" cy="1700" r="900" fill="url(#planete)"/>
<g id="nuages" opacity="0.35" clip-path="url(#disque-planete)">
  <path d="M200 900 Q600 830 1000 870 T1800 860" stroke="white" stroke-width="22" stroke-linecap="round"/>
  <path d="M400 990 Q800 940 1300 970" stroke="white" stroke-width="16" stroke-linecap="round"/>
</g>
<circle id="lune" cx="1500" cy="280" r="60" fill="#cfd3dc"/>
<circle cx="1480" cy="265" r="12" fill="#aeb3bf"/><circle cx="1520" cy="300" r="8" fill="#aeb3bf"/>'''
    return page(defs, body)


# ---------------------------------------------------------------- Casino
def green_felt():
    defs = rad("tapis", [(0, "#1f8a5a"), (0.7, "#0f5c3a"), (1, "#062a1b")], 960, 420, 1200)
    spots = "".join(f'<rect x="{960 + 620 * math.cos(math.radians(a)) - 55:.0f}" y="{150 + 520 * math.sin(math.radians(a)) - 78:.0f}" width="110" height="156" rx="12" '
                    f'stroke="#e9d9a6" stroke-opacity="0.45" stroke-width="4" transform="rotate({a - 90:.0f} {960 + 620 * math.cos(math.radians(a)):.0f} {150 + 520 * math.sin(math.radians(a)):.0f})"/>'
                    for a in range(30, 151, 24))
    body = f'''<rect id="tapis" width="{W}" height="{H}" fill="url(#tapis)"/>
<g id="marquages">
  <path d="M260 220 Q960 1000 1660 220" stroke="#e9d9a6" stroke-opacity="0.45" stroke-width="5"/>
  <path d="M200 160 Q960 1100 1720 160" stroke="#e9d9a6" stroke-opacity="0.3" stroke-width="3"/>
  {spots}
</g>'''
    return page(defs, body)


def red_velvet():
    defs = rad("lumiere", [(0, "#000000", 0), (1, "#000000", 0.55)], 960, 500, 1100)
    step = 160
    cushions, buttons = [], []
    for row in range(-1, H // (step // 2) + 2):
        for col in range(-1, W // step + 2):
            cx = col * step + (step / 2 if row % 2 else 0)
            cy = row * step / 2
            cushions.append(f'<path d="M{cx} {cy - step / 2} L{cx + step / 2} {cy} L{cx} {cy + step / 2} L{cx - step / 2} {cy} Z" fill="url(#coussin)"/>')
            buttons.append(f'<circle cx="{cx}" cy="{cy - step / 2}" r="7" fill="#3a0510"/>')
    defs += '<radialGradient id="coussin" cx="0.45" cy="0.4" r="0.7"><stop offset="0" stop-color="#c0182f"/><stop offset="1" stop-color="#5c0716"/></radialGradient>'
    body = f'''<rect width="{W}" height="{H}" fill="#5c0716"/>
<g id="capitonnage">{"".join(cushions)}</g>
<g id="boutons">{"".join(buttons)}</g>
<rect id="eclairage" width="{W}" height="{H}" fill="url(#lumiere)"/>'''
    return page(defs, body)


def poker_table():
    defs = rad("salle", [(0, "#1c1410"), (1, "#060403")], 960, 540, 1100) + lin("bois", [(0, "#8a5a2b"), (0.5, "#4a2c12"), (1, "#8a5a2b")], 0, 140, 0, 940) + \
        rad("feutre", [(0, "#1f8a5a"), (1, "#0a4a2e")], 960, 520, 700)
    cards = "".join(f'<rect x="{700 + i * 110}" y="460" width="90" height="128" rx="10" stroke="#e9d9a6" stroke-opacity="0.5" stroke-width="4"/>' for i in range(5))
    body = f'''<rect id="salle" width="{W}" height="{H}" fill="url(#salle)"/>
<ellipse id="ombre" cx="960" cy="560" rx="860" ry="430" fill="black" fill-opacity="0.5"/>
<ellipse id="bordure" cx="960" cy="540" rx="840" ry="410" fill="url(#bois)"/>
<ellipse id="coussin" cx="960" cy="540" rx="760" ry="340" fill="#1a1a1a"/>
<ellipse id="tapis" cx="960" cy="540" rx="730" ry="315" fill="url(#feutre)"/>
<ellipse id="ligne" cx="960" cy="540" rx="560" ry="220" stroke="#e9d9a6" stroke-opacity="0.35" stroke-width="4"/>
<g id="cartes">{cards}</g>'''
    return page(defs, body)


def roulette():
    defs = rad("salle", [(0, "#16101a"), (1, "#050307")], 960, 540, 1100) + rad("bois", [(0.85, "#6b3f1a"), (1, "#2e1a0a")], 1300, 540, 560)
    cx, cy = 1300, 540
    pockets = []
    for i in range(37):
        a0, a1 = 2 * math.pi * i / 37, 2 * math.pi * (i + 1) / 37
        color = "#0f8a4a" if i == 0 else ("#c4122f" if i % 2 else "#141414")
        p = [(cx + r * math.cos(a), cy + r * math.sin(a)) for r, a in [(330, a0), (440, a0), (440, a1), (330, a1)]]
        pockets.append(f'<path d="M{p[0][0]:.1f} {p[0][1]:.1f} L{p[1][0]:.1f} {p[1][1]:.1f} L{p[2][0]:.1f} {p[2][1]:.1f} L{p[3][0]:.1f} {p[3][1]:.1f} Z" fill="{color}" stroke="#d9b54a" stroke-width="2"/>')
    spokes = "".join(f'<path d="M{cx} {cy} L{cx + 300 * math.cos(math.radians(a)):.0f} {cy + 300 * math.sin(math.radians(a)):.0f}" stroke="#d9b54a" stroke-width="16" stroke-linecap="round"/>'
                     for a in range(0, 360, 90))
    body = f'''<rect id="salle" width="{W}" height="{H}" fill="url(#salle)"/>
<circle id="ombre" cx="{cx + 20}" cy="{cy + 30}" r="560" fill="black" fill-opacity="0.5"/>
<circle id="cuvette" cx="{cx}" cy="{cy}" r="560" fill="url(#bois)"/>
<circle id="piste" cx="{cx}" cy="{cy}" r="470" fill="#2a1a10" stroke="#d9b54a" stroke-width="4"/>
<g id="cases">{"".join(pockets)}</g>
<circle id="cone" cx="{cx}" cy="{cy}" r="330" fill="#5a3415"/>
<circle cx="{cx}" cy="{cy}" r="250" fill="#7a4a1e"/>
<g id="tourelle">{spokes}<circle cx="{cx}" cy="{cy}" r="50" fill="#d9b54a"/></g>
<circle id="bille" cx="{cx + 455 * math.cos(1.1):.0f}" cy="{cy + 455 * math.sin(1.1):.0f}" r="16" fill="#f5f5f5"/>'''
    return page(defs, body)


# ---------------------------------------------------------------- Saisons et fêtes
def halloween():
    defs = lin("ciel", [(0, "#12052b"), (1, "#4a1a6b")]) + rad("lune", [(0, "#ffe7a3"), (1, "#ff9f1c")], 1350, 330, 210) + blur("halo", 40)
    bat = "M0 0 q-20 -18 -48 -8 q14 6 10 18 q-14 -6 -26 4 q16 2 20 14 q16 -14 44 -10 q28 -4 44 10 q4 -12 20 -14 q-12 -10 -26 -4 q-4 -12 10 -18 q-28 -10 -48 8 Z"
    bats = "".join(f'<path d="{bat}" fill="#0b0414" transform="translate({x} {y}) scale({s})"/>' for x, y, s in [(1120, 220, 1.2), (1530, 470, 0.9), (1260, 520, 0.7), (520, 260, 1)])
    tombs = "".join(f'<path d="M{x} 920 V{920 - h + 30} Q{x} {920 - h} {x + 30} {920 - h} Q{x + 60} {920 - h} {x + 60} {920 - h + 30} V920 Z" fill="#1c0f2b"/>'
                    for x, h in [(380, 110), (520, 90), (1500, 120), (1660, 95)])
    pumpkins = "".join(f'<g><ellipse cx="{x}" cy="{y}" rx="{r * 1.25:.0f}" ry="{r}" fill="#ff7a1a"/><ellipse cx="{x}" cy="{y}" rx="{r * 0.5:.0f}" ry="{r}" fill="#e05f00"/>'
                       f'<rect x="{x - 6}" y="{y - r - 18}" width="12" height="24" rx="4" fill="#3b6b1a"/></g>'
                       for x, y, r in [(760, 980, 55), (880, 1000, 40), (1180, 990, 50)])
    tree = '<path d="M180 1000 L230 600 Q160 520 90 480 M215 650 Q290 560 360 540 M225 560 Q200 460 240 400" stroke="#0b0414" stroke-width="26" stroke-linecap="round"/>'
    body = f'''<rect id="ciel" width="{W}" height="{H}" fill="url(#ciel)"/>
<circle id="halo" cx="1350" cy="330" r="260" fill="#ffb347" fill-opacity="0.35" filter="url(#halo)"/>
<circle id="lune" cx="1350" cy="330" r="210" fill="url(#lune)"/>
<g id="chauves-souris">{bats}</g>
<g id="colline">{ridge(900, 40, 121, "#1c0f2b", step=380)}</g>
<g id="tombes">{tombs}</g>
<g id="arbre">{tree}</g>
<g id="citrouilles">{pumpkins}</g>'''
    return page(defs, body)


def christmas():
    defs = lin("ciel", [(0, "#0b1a3a"), (1, "#2c4a7a")])
    rnd = random.Random(131)
    snow = "\n".join(f'  <circle cx="{rnd.uniform(0, W):.0f}" cy="{rnd.uniform(0, H):.0f}" r="{rnd.uniform(2, 7):.1f}" fill="white" fill-opacity="{rnd.uniform(0.4, 0.95):.2f}"/>'
                     for _ in range(220))
    trees_back = "".join(fir(x, 820 + rnd.uniform(-15, 15), rnd.uniform(140, 200), "#1f4d4a", snow="#e8f1ff") for x in range(-30, W + 60, 140))
    trees_front = "".join(fir(x, 1000, rnd.uniform(220, 300), "#0f2e2c", snow="#ffffff") for x in (120, 330, 1580, 1800))
    cabin = '''<g id="chalet"><rect x="900" y="840" width="180" height="120" fill="#4a2a1a"/><path d="M880 850 L990 760 L1100 850 Z" fill="#f4f8ff"/>
  <rect x="930" y="880" width="40" height="36" fill="#ffd36b"/><rect x="1010" y="880" width="40" height="36" fill="#ffd36b"/></g>'''
    body = f'''<rect id="ciel" width="{W}" height="{H}" fill="url(#ciel)"/>
<g id="etoiles">
{stars(80, 132, 500)}
</g>
<g id="neige-colline">{ridge(820, 30, 133, "#c9d8f0", step=360)}</g>
<g id="sapins-loin">{trees_back}</g>
<g id="neige">{ridge(960, 25, 134, "#f4f8ff", step=420)}</g>
{cabin}
<g id="sapins">{trees_front}</g>
<g id="flocons">
{snow}
</g>'''
    return page(defs, body)


def summer():
    defs = lin("ciel", [(0, "#ff7e5f"), (0.55, "#feb47b"), (1, "#ffe0a3")], y2=620) + lin("mer", [(0, "#2b8fb3"), (1, "#0e4d6e")], y1=620, y2=860) + \
        rad("soleil", [(0, "#fff6d8"), (1, "#ffcf5c")], 960, 600, 150)

    def palm(x, y, lean):
        trunk = f'<path d="M{x} {y} Q{x + lean * 0.5} {y - 250} {x + lean} {y - 480}" stroke="#2b1a14" stroke-width="28" stroke-linecap="round"/>'
        tx, ty = x + lean, y - 480
        fronds = "".join(f'<path d="M{tx} {ty} Q{tx + 120 * math.cos(math.radians(a))} {ty + 120 * math.sin(math.radians(a)) - 40} {tx + 230 * math.cos(math.radians(a))} {ty + 230 * math.sin(math.radians(a)) + 40}" stroke="#2b1a14" stroke-width="22" stroke-linecap="round"/>'
                         for a in (-170, -140, -110, -70, -40, -10))
        return trunk + fronds
    body = f'''<rect id="ciel" width="{W}" height="620" fill="url(#ciel)"/>
<circle id="soleil" cx="960" cy="600" r="150" fill="url(#soleil)"/>
<rect id="mer" y="620" width="{W}" height="300" fill="url(#mer)"/>
<g id="reflets">{"".join(f'<rect x="{960 - w / 2}" y="{640 + i * 26}" width="{w}" height="6" rx="3" fill="#ffd27a" fill-opacity="0.7"/>' for i, w in enumerate([260, 200, 230, 150, 170, 90, 110]))}</g>
<path id="sable" d="M0 880 Q480 830 960 870 T1920 860 V1080 H0 Z" fill="#f2c88c"/>
<path d="M0 960 Q600 930 1200 970 T1920 950 V1080 H0 Z" fill="#e3b06f"/>
<g id="palmiers">{palm(220, 1000, 140)}{palm(1700, 1010, -160)}</g>'''
    return page(defs, body)


def autumn():
    defs = lin("ciel", [(0, "#f6d6a8"), (1, "#f2a65a")])
    rnd = random.Random(151)
    colors = ["#d9480f", "#e8590c", "#f08c00", "#c92a2a", "#b5651d"]
    trees = []
    for x in range(60, W, 210):
        h = rnd.uniform(380, 560)
        trees.append(f'<rect x="{x - 14}" y="{1080 - h}" width="28" height="{h}" fill="#4a2c18"/>')
        for _ in range(6):
            trees.append(f'<circle cx="{x + rnd.uniform(-90, 90):.0f}" cy="{1080 - h + rnd.uniform(-60, 80):.0f}" r="{rnd.uniform(70, 120):.0f}" fill="{rnd.choice(colors)}"/>')
    falling = "".join(f'<ellipse cx="0" cy="0" rx="16" ry="8" fill="{rnd.choice(colors)}" transform="translate({rnd.uniform(0, W):.0f} {rnd.uniform(0, H):.0f}) rotate({rnd.uniform(0, 180):.0f})"/>'
                      for _ in range(60))
    body = f'''<rect id="ciel" width="{W}" height="{H}" fill="url(#ciel)"/>
<g id="arbres">{"".join(trees)}</g>
<g id="sol">{ridge(1000, 25, 152, "#8a3b12", step=400)}</g>
<g id="feuilles">{falling}</g>'''
    return page(defs, body)


def spring():
    defs = lin("ciel", [(0, "#cfe8ff"), (1, "#fde2ef")])
    rnd = random.Random(161)

    def branch(x0, y0, dx, dy):
        flowers = "".join(f'<g transform="translate({x0 + dx * t + rnd.uniform(-60, 60):.0f} {y0 + dy * t + rnd.uniform(-50, 50):.0f})">'
                          + "".join(f'<ellipse cx="0" cy="-14" rx="11" ry="16" fill="#ffc2d9" transform="rotate({72 * k})"/>' for k in range(5))
                          + '<circle r="6" fill="#e64980"/></g>'
                          for t in [i / 18 for i in range(1, 18)])
        return (f'<path d="M{x0} {y0} Q{x0 + dx * 0.5} {y0 + dy * 0.2} {x0 + dx} {y0 + dy}" stroke="#4a2c2a" stroke-width="22" stroke-linecap="round"/>'
                f'{flowers}')
    petals = "".join(f'<ellipse cx="0" cy="0" rx="10" ry="6" fill="#ffc2d9" transform="translate({rnd.uniform(0, W):.0f} {rnd.uniform(0, H):.0f}) rotate({rnd.uniform(0, 180):.0f})"/>'
                     for _ in range(70))
    body = f'''<rect id="ciel" width="{W}" height="{H}" fill="url(#ciel)"/>
<g id="collines">{ridge(900, 40, 162, "#b8e0b0", step=420)}{ridge(990, 30, 163, "#8cc98a", step=380)}</g>
<g id="branches">{branch(-40, 120, 620, 180)}{branch(1960, 60, -560, 220)}</g>
<g id="petales">{petals}</g>'''
    return page(defs, body)


SERIES = {
    "paysages": {"desert": desert, "montagnes": mountains, "ocean_nuit": ocean_night, "foret_brumeuse": misty_forest,
                 "lac": lake, "collines": hills},
    "espace": {"nebuleuse": nebula, "aurore_boreale": aurora, "ciel_etoile": starry_sky, "galaxie": galaxy,
               "eclipse": eclipse, "lever_de_planete": planet_rise},
    "casino": {"tapis_vert": green_felt, "velours_rouge": red_velvet, "table_de_poker": poker_table, "roulette": roulette},
    "saisons": {"halloween": halloween, "noel": christmas, "ete": summer, "automne": autumn, "printemps": spring},
}

count = 0
for folder, items in SERIES.items():
    for slug, make in items.items():
        write(folder, slug, make())
        count += 1
print(f"{count} fonds dans {OUT}")
