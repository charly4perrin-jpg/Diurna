"""Polices du site, allégées : python3 tools/fonts.py
Part des polices complètes (tools/fonts-src/, variables, toutes graisses) et écrit dans assets/fonts/ :
- newsreader-text : Newsreader romain, graisses 400 à 700, taille optique fixée à 18 ;
- newsreader-italic : Newsreader italique 400 (notes et fins d'édition) ;
- archivo : Archivo, graisses 400 à 700, chasse normale.
Jeu de caractères : latin de base et latin-1 (français, allemand, espagnol…), ponctuation française, €, flèches.
Les polices sources (paquets « latin » de Fontsource) n'ont pas les lettres d'Europe centrale : le navigateur
les prend alors dans une police système proche.
Les images de partage et le carrousel utilisent les polices complètes de tools/fonts-src/."""
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(HERE, 'fonts-src'), os.path.join(HERE, '..', 'assets', 'fonts')
CORE = ('U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+0178,U+02C6,U+02DA,U+02DC,U+2009-200B,U+2010-2014,U+2018-201E,'
        'U+2020-2022,U+2026,U+202F,U+2032-2033,U+2039-203A,U+2044,U+20AC,U+2116,U+2122,U+2190-2193,U+2212,U+2248,U+2260,U+2264-2265')
ITALIC_CORE = 'U+0020-007E,U+00A0-00FF,U+0152-0153,U+2013-2014,U+2018-201E,U+2026,U+202F,U+20AC'
JOBS = [
    ('newsreader-text', 'newsreader-latin-standard-normal.woff2', {'wght': (400, 700), 'opsz': 18}, ['kern', 'liga', 'tnum'], CORE),
    ('newsreader-italic', 'newsreader-latin-standard-italic.woff2', {'wght': 400, 'opsz': 18}, ['kern', 'liga'], ITALIC_CORE),
    ('archivo', 'archivo-latin-standard-normal.woff2', {'wght': (400, 700), 'wdth': 100}, ['kern', 'liga'], CORE),
]

def build(src, out, limits, feats, uni):
    f = instancer.instantiateVariableFont(TTFont(os.path.join(SRC, src)), limits)
    o = subset.Options()
    o.flavor, o.layout_features, o.name_IDs, o.hinting, o.desubroutinize = 'woff2', feats, [1, 2, 3, 4, 6], False, True
    s = subset.Subsetter(o)
    s.populate(unicodes=subset.parse_unicodes(uni))
    s.subset(f)
    f.flavor = 'woff2'
    f.save(os.path.join(OUT, out))
    return os.path.getsize(os.path.join(OUT, out))

total = 0
for name, src, limits, feats, uni in JOBS:
    a = build(src, name + '.woff2', limits, feats, uni)
    total += a
    print(f'{name}: {a / 1000:.1f} ko')
print(f'Total : {total / 1000:.1f} ko')
